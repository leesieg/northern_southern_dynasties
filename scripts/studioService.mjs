import {mkdir,readFile,writeFile,open,rename,unlink,link,lstat,realpath} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {compileOfficialPackage,createContentRealm,openPackagePreview,projectRoot} from './contentPackageCompiler.mjs';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const schemas={status:[],snapshot:[],schema:[],search:['target','query'],read:['target','id','scenarioId'],references:['target','id'],propose:['key','baseRevision','title','operations'],preflight:['proposalId'],apply:['key','proposalId'],reject:['key','proposalId'],grant:['key','proposalId'],undo:['key','baseRevision','revision'],check:['scenarioId'],preview:['scenarioId','characterId','days'],export:['scenarioId'],backup:[]};
/** One fixed local workspace. HTTP and CLI both use this service, including the
 * cross-process lock and single-file atomic commit. Actor comes from the adapter. */
export async function createStudioService({root=join(projectRoot,'.studio'),bundle,beforeRename}={}){
 root=resolve(root);await mkdir(root,{recursive:true});
 if((await lstat(root)).isSymbolicLink()||await realpath(root)!==root)throw new Error('工作区不得使用符号链接。');
 const realm=await createContentRealm(),m=await realm.ssrLoadModule('/src/studio/model.ts');
 let official=bundle,closed=false;
 const getBundle=async()=>official??=(await compileOfficialPackage());
 const fail=(code,message,details,status)=>{throw new m.StudioError(code,message,details,status);};
 async function safeFile(name){const path=join(root,name);try{if(!(await lstat(path)).isFile()||(await lstat(path)).isSymbolicLink())fail('PATH','工作区文件类型不安全。');}catch(e){if(e.code!=='ENOENT')throw e;}return path;}
 async function locked(fn){
  if(closed)throw new Error('工作区服务已关闭。');
  const lock=await safeFile('lock'),owner=join(root,'owner-'+randomUUID());await writeFile(owner,JSON.stringify({pid:process.pid}),{flag:'wx',mode:0o600});
  let acquired=false;
  try{
   for(let i=0;i<200;i++){
    try{await link(owner,lock);acquired=true;break;}catch(e){if(e.code!=='EEXIST')throw e;}
    let holder;try{holder=JSON.parse(await readFile(await safeFile('lock'),'utf8'));}catch(e){if(e.code==='ENOENT')continue;throw e;}
    if(!Number.isSafeInteger(holder.pid)||holder.pid<1)fail('LOCK','工作区锁损坏，请人工检查。');
    try{process.kill(holder.pid,0);}catch(e){if(e.code==='ESRCH'){
     // Serialize dead-owner cleanup too: two recoverers must never unlink a
     // newly acquired live lock after observing the same abandoned lock.
     const recovery=await safeFile('recovery-lock');let recovering=false;
     try{await link(owner,recovery);recovering=true;const current=JSON.parse(await readFile(await safeFile('lock'),'utf8'));try{process.kill(current.pid,0);}catch(error){if(error.code==='ESRCH')await unlink(lock);else if(error.code!=='EPERM')throw error;}}
     catch(error){if(!['ENOENT','EEXIST'].includes(error.code))throw error;}
     finally{if(recovering)await unlink(recovery);}
     continue;
    }if(e.code!=='EPERM')throw e;}
    await sleep(10);
   }
   if(!acquired)fail('BUSY','另一个进程正在保存，请重试。',null,409);
   return await fn();
  }finally{await unlink(owner);if(acquired)await unlink(lock);}
 }
 async function persist(state){
  const path=await safeFile('state.json'),temp=join(root,'pending-'+randomUUID());const file=await open(temp,'wx',0o600);
  try{await file.writeFile(JSON.stringify(state));await file.sync();}finally{await file.close();}
  try{await beforeRename?.();await rename(temp,path);const dir=await open(root,'r');try{await dir.sync();}finally{await dir.close();}}
  finally{await unlink(temp).catch(e=>{if(e.code!=='ENOENT')throw e;});}
 }
 async function load(){
  try{const state=JSON.parse(await readFile(await safeFile('state.json'),'utf8'));if(state.format!=='fynbc-studio-v1')fail('FORMAT','不支持的工作区格式。');
   if(state.revision===0&&state.proposals.length===0&&m.equal(state.document,m.projectDraft(state.base))){const {content,environment}=await getBundle();if(state.base.digest!==content.digest){state.base=content;state.environment=environment;state.document=m.projectDraft(content);state.sequence++;await persist(state);}}
   return state;}
  catch(e){if(e.code!=='ENOENT')throw e;const {content,environment}=await getBundle();const state={format:'fynbc-studio-v1',base:content,environment,document:m.projectDraft(content),revision:0,sequence:0,proposals:[],history:[],receipts:{}};await persist(state);return state;}
 }
 function proposal(s,id){const p=s.proposals.find(p=>p.id===id);if(!p)fail('MISSING','提案不存在。');return p;}
 function candidate(s,p){if(p.status!=='pending')fail('STATUS','提案已经处理。',null,409);if(p.baseRevision!==s.revision)fail('CONFLICT','工作区版本已变化，请重新读取并提交提案。',{expected:p.baseRevision,actual:s.revision,operations:p.operations.map(op=>({...op,actual:m.currentValue(s.document,s.base,op)}))},409);return m.applyOperations(s.document,s.base,p.operations);}
 function commit(s,p,next){
  const inverse=m.inverseOperations(s.document,next,s.base);
  // Undo creation/deletion uses the same semantic/reference checks as editing.
  s.document=next;s.revision++;p.status='applied';p.appliedRevision=s.revision;p.granted=false;
  const receipt={revision:s.revision,proposalId:p.id,title:p.title,actor:p.actor};s.history.push({...receipt,operations:p.operations,inverse});return receipt;
 }
 async function compile(s,scenarioId){
  const {environment}=bundle??await compileOfficialPackage();if(s.environment.engine!==environment.engine||s.environment.assets!==environment.assets)fail('DEPENDENCY','基础规则或资产已经变化；保留当前草稿，请使用匹配版本后再编译。');
  const tables=m.compileDraftTables(s.document,s.base,scenarioId),compiler=await realm.ssrLoadModule('/src/core/contentPackage.ts');return {content:await compiler.compileContentPackage(tables,'studio-local',environment),environment};
 }
 async function runPreview(s,input,compiled){
  const {content,environment}=compiled??await compile(s,input.scenarioId);let snapshot,receipt,host;
  const days=input.days??0;if(!Number.isSafeInteger(days)||days<0||days>7)fail('RANGE','试玩推进仅接受 0—7 日。');
  try{
   host=await openPackagePreview(content,environment,v=>{if(v.type==='world')snapshot=v;if(v.type==='receipt')receipt=v;});
   async function send(value){receipt=null;await host.dispatch({...value,requestId:randomUUID()});if(!receipt?.ok)fail('PREVIEW',receipt?.text??'试玩未返回回执。');}
   await send({type:'init'});await send({type:'new',scriptId:input.scenarioId,characterId:input.characterId??s.document.scenarios[input.scenarioId].defaultCharacter,mode:'sandbox'});
   for(let i=0;i<days;i++)await send({type:'step'});
   const w=snapshot.world;return {revision:s.revision,digest:content.digest,storage:'isolated-memory',day:w.day,characterId:w.characterId,person:w.people[0],governedCities:w.holdings.governedCities,identity:w.identities?.people[w.characterId],privateReserve:w.relationships?.reserves[w.characterId],chronicle:w.chronicle.slice(-6),actualOffices:Object.fromEntries(Object.entries(w.realm?.cities??{}).filter(([,c])=>c.governor===w.characterId).map(([id])=>[id,w.characterId]))};
  }finally{await host?.close();}
 }
 async function request(method,input={},actor='ai'){
  if(!['ai','human'].includes(actor))fail('ACTOR','未知调用方。');
  if(!Object.hasOwn(schemas,method)||!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!schemas[method].includes(k)))fail('REQUEST','未知请求字段、方法或作用域。');
  const mutating=['propose','apply','reject','grant','undo'].includes(method);
  if(mutating&&(typeof input.key!=='string'||!/^[a-zA-Z0-9:_-]{1,100}$/.test(input.key)))fail('KEY','写入必须带唯一幂等键。');
  return locked(async()=>{
   const s=await load(),fingerprint=hash({method,input,actor}),receiptKey=actor+':'+input.key;
   if(mutating&&s.receipts[receiptKey]){const old=s.receipts[receiptKey];if(old.fingerprint!==fingerprint)fail('IDEMPOTENCY','此幂等键已用于另一请求。',null,409);return old.result;}
   let result;
   switch(method){
    case 'status':return {revision:s.revision,sequence:s.sequence};
    case 'schema':return {version:1,scope:'local-workspace',methods:schemas,fields:m.fields,targets:['people','families','scenarios','states'],aiPolicy:'propose-first; human review or per-proposal grant required',operations:{target:'required',id:'required',scenarioId:'states only',field:'omit for create/delete',before:'required exact value',after:'required typed value'},atomicity:'one revision/document/history/receipt file'};
    case 'snapshot':return {revision:s.revision,sequence:s.sequence,document:s.document,proposals:s.proposals,history:s.history,diagnostics:m.diagnose(s.document,s.base),sites:s.base.tables.scenario.sites,baseDigest:s.base.digest,baseDocument:m.projectDraft(s.base),states:Object.fromEntries(Object.values(s.document.scenarios).map(sc=>[sc.id,Object.fromEntries(Object.keys(s.document.people).map(id=>[id,m.effectiveState(s.document,s.base,sc.id,id)]))]))};
    case 'backup':return {format:'fynbc-studio-backup-v1',revision:s.revision,base:s.base,document:s.document,history:s.history};
    case 'search':{if(!['people','families','scenarios'].includes(input.target)||typeof input.query!=='string')fail('QUERY','无效搜索。');return Object.values(s.document[input.target]).filter(v=>(v.id+' '+v.name).includes(input.query)).map(({id,name})=>({id,name}));}
    case 'read':m.validId(input.id);if(input.target==='states'){if(!s.document.people[input.id]||!s.document.scenarios[input.scenarioId])fail('REFERENCE','人物或剧本不存在。');return m.effectiveState(s.document,s.base,input.scenarioId,input.id);}if(!['people','families','scenarios'].includes(input.target))fail('SCOPE','不支持的读取作用域。');return s.document[input.target][input.id]??null;
    case 'references':m.validId(input.id);if(!['people','families','scenarios'].includes(input.target))fail('SCOPE','不支持的引用作用域。');return m.references(s.document,s.base,input.target,input.id);
    case 'propose':{
     if(!Number.isSafeInteger(input.baseRevision)||input.baseRevision!==s.revision)fail('CONFLICT','基础版本已变化。',{expected:input.baseRevision,actual:s.revision},409);
     if(typeof input.title!=='string'||!input.title.trim()||input.title.length>200)fail('TITLE','提案须有 1—200 字标题。');
     const next=m.applyOperations(s.document,s.base,input.operations);const p={id:randomUUID(),baseRevision:s.revision,title:input.title,actor,operations:input.operations,status:'pending',granted:false};s.proposals.push(p);result={...p,diagnostics:m.diagnose(next,s.base)};break;
    }
    case 'preflight':{const p=proposal(s,input.proposalId);return {revision:s.revision,operations:p.operations,diagnostics:m.diagnose(candidate(s,p),s.base),canApply:actor==='human'||p.granted};}
    case 'apply':{const p=proposal(s,input.proposalId);if(actor!=='human'&&!p.granted)fail('AUTH','AI 提案尚未获得人工审阅或授权。',null,403);result=commit(s,p,candidate(s,p));break;}
    case 'grant':{if(actor!=='human')fail('AUTH','仅人工界面可授权指定提案。',null,403);const p=proposal(s,input.proposalId);candidate(s,p);p.granted=true;result={proposalId:p.id,granted:true,baseRevision:p.baseRevision};break;}
    case 'reject':{if(actor!=='human')fail('AUTH','仅人工界面可退回提案。',null,403);const p=proposal(s,input.proposalId);if(p.status!=='pending')fail('STATUS','提案已处理。');p.status='rejected';p.granted=false;result={proposalId:p.id,status:p.status};break;}
    case 'undo':{
     if(actor!=='human')fail('AUTH','AI 须把撤销作为反向提案提交。',null,403);
     if(input.baseRevision!==s.revision)fail('CONFLICT','撤销所依据的版本已变化。',null,409);
     const h=s.history.find(h=>h.revision===input.revision);if(!h)fail('MISSING','没有此已应用版本。');
     const p={id:randomUUID(),baseRevision:s.revision,title:'撤销：'+h.title,actor,operations:h.inverse,status:'pending',granted:false};
     result=commit(s,p,candidate(s,p));s.proposals.push(p);break;
    }
    case 'check':{const issues=m.diagnose(s.document,s.base,input.scenarioId);if(issues.length)return {revision:s.revision,diagnostics:issues};const compiled=await compile(s,input.scenarioId);await runPreview(s,input,compiled);return {revision:s.revision,digest:compiled.content.digest,diagnostics:[]};}
    case 'export':{const compiled=await compile(s,input.scenarioId);await runPreview(s,input,compiled);return compiled.content;}
    case 'preview':return runPreview(s,input);
   }
   s.sequence++;s.receipts[receiptKey]={fingerprint,result};await persist(s);return result;
  });
 }
 return {request,close:async()=>{closed=true;await realm.close();}};
}
