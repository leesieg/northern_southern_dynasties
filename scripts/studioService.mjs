import {isDeepStrictEqual} from 'node:util';
import {generateStudioBoundaries} from './studioGeometry.mjs';
import {makeRelease,verifyRelease} from './studioRelease.mjs';
import {assertJSON,largeMethods,sealed,verifySeal,bytesDigest} from './studioSafety.mjs';
import {makeBackup,mergeDraft,migrationSource} from './studioMigration.mjs';
import {debugStudioEvent} from './studioEventDebug.mjs';
import {mkdir,readFile,writeFile,open,rename,unlink,link,lstat,realpath} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {compileOfficialPackage,createContentRealm,openPackagePreview,projectRoot} from './contentPackageCompiler.mjs';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const schemas={recoveryStatus:[],recoveryPreview:['slot'],recover:['key','slot','expectedState','checkpointDigest'],migrationPreview:['source','resolutions'],proposeMigration:['key','baseRevision','source','resolutions'],copyScenario:['scenarioId','id','name'],strategyTemplate:['scenarioId'],mapPreview:['scenarioId','from','to'],generateBoundaries:[],exportBundle:['scenarioId'],importPreview:['release','days'],proposeImport:['key','baseRevision','release'],status:[],snapshot:[],schema:[],search:['target','query'],read:['target','id','scenarioId'],references:['target','id'],propose:['key','baseRevision','title','operations'],preflight:['proposalId'],apply:['key','proposalId'],reject:['key','proposalId'],grant:['key','proposalId'],undo:['key','baseRevision','revision'],check:['scenarioId'],preview:['scenarioId','characterId','days'],export:['scenarioId'],backup:[],debugEvent:['key','baseRevision','testId','choices'],debugReport:['id']};
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
 function decodeState(text){const state=JSON.parse(text);if(state&&Object.hasOwn(state,'integrity')){const {integrity,...payload}=state;if(hash(payload)!==integrity)fail('CORRUPT','草稿完整性校验失败，请预览恢复点。');delete state.integrity;}if(!state||state.format!=='fynbc-studio-v1'||!Number.isSafeInteger(state.revision)||state.revision<0||!Number.isSafeInteger(state.sequence)||state.sequence<0||!Array.isArray(state.proposals)||!Array.isArray(state.history)||!state.receipts||!state.document||!state.base)fail('FORMAT','草稿格式损坏或版本不支持，请预览恢复点。');return state;}
 async function rawState(){try{return await readFile(await safeFile('state.json'),'utf8');}catch(e){if(e.code==='ENOENT')return null;throw e;}}
 async function writeAtomic(name,value){const path=await safeFile(name),temp=join(root,'pending-'+randomUUID()),file=await open(temp,'wx',0o600);try{await file.writeFile(value);await file.sync();}finally{await file.close();}try{await rename(temp,path);}finally{await unlink(temp).catch(e=>{if(e.code!=='ENOENT')throw e;});}}
 function verifyCheckpoint(v){if(v?.format!=='fynbc-studio-checkpoint-v1'||Object.keys(v).sort().join(',')!=='digest,format,state')fail('FORMAT','不支持的恢复点格式。');verifySeal(v);}
 async function checkpoints(){const rows=[];for(let slot=0;slot<3;slot++){try{const v=JSON.parse(await readFile(await safeFile('checkpoint-'+slot+'.json'),'utf8'));verifyCheckpoint(v);decodeState(JSON.stringify(v.state));rows.push({slot,digest:v.digest,revision:v.state.revision,sequence:v.state.sequence});}catch(e){if(e.code!=='ENOENT')rows.push({slot,error:e.message});}}return rows;}
 async function recoveryPreview(slot){if(!Number.isInteger(slot)||slot<0||slot>2)fail('SCOPE','恢复点仅接受固定槽位 0—2。');const v=JSON.parse(await readFile(await safeFile('checkpoint-'+slot+'.json'),'utf8'));verifyCheckpoint(v);const state=decodeState(JSON.stringify(v.state));m.assertDraft(state.document,state.base);const raw=await rawState();let operations=null;try{if(raw!==null){const current=decodeState(raw);operations=m.inverseOperations(state.document,current.document,current.base);}}catch{}return {state,preview:{slot,checkpointDigest:v.digest,expectedState:raw===null?null:bytesDigest(raw),revision:state.revision,operations,proposals:state.proposals.map(p=>({id:p.id,title:p.title,status:p.status})),diagnostics:m.diagnose(state.document,state.base),document:state.document}};}
 async function persist(state){
  const raw=await rawState();let previous;try{if(raw!==null)previous=decodeState(raw);}catch{/* Damaged input is preserved by explicit recovery, never promoted to a checkpoint. */}
  if(previous)await writeAtomic('checkpoint-'+(previous.sequence%3)+'.json',JSON.stringify(sealed({format:'fynbc-studio-checkpoint-v1',state:previous})));
  const path=await safeFile('state.json'),temp=join(root,'pending-'+randomUUID());const file=await open(temp,'wx',0o600);
  try{await file.writeFile(JSON.stringify({...state,integrity:hash(state)}));await file.sync();}finally{await file.close();}
  try{await beforeRename?.();await rename(temp,path);const dir=await open(root,'r');try{await dir.sync();}finally{await dir.close();}}
  finally{await unlink(temp).catch(e=>{if(e.code!=='ENOENT')throw e;});}
 }
 async function load(){
  try{const state=decodeState(await readFile(await safeFile('state.json'),'utf8'));
   if(!state.document.events||!state.document.eventTests){
    const binding=await realm.ssrLoadModule('/src/core/contentBinding.ts'),known=binding.phaseTwoOfficialSave;
    if(state.base.packageId!==known.packageId||state.base.digest!==known.digest||state.base.dependencies.engine!==known.engine||state.base.dependencies.assets!==known.assets)fail('MIGRATION','旧工作区基础版本未知，已保留，请先导出并人工迁移。');
    const {content,environment}=await getBundle();state.document.events??={};state.document.eventTests??={};Object.assign(state.document,m.projectGeography(content));for(const scenario of Object.values(state.document.scenarios))scenario.strategy=null;state.base=content;state.environment=environment;state.revision++;state.sequence++;state.migrations=[...(state.migrations??[]),{from:known.digest,to:content.digest,revision:state.revision,reason:'事件编辑能力升级；人物与剧本草稿保留'}];for(const p of state.proposals)p.granted=false;await persist(state);
   }
   if(!state.document.sites){
    const binding=await realm.ssrLoadModule('/src/core/contentBinding.ts'),known=binding.phaseThreeOfficialSave;
    if(state.base.packageId!==known.packageId||state.base.digest!==known.digest||state.base.dependencies.engine!==known.engine||state.base.dependencies.assets!==known.assets)fail('MIGRATION','旧战略工作区基础版本未知，已保留，请先导出并人工迁移。');
    const {content,environment}=await getBundle();Object.assign(state.document,m.projectGeography(content));for(const scenario of Object.values(state.document.scenarios))scenario.strategy=null;state.base=content;state.environment=environment;state.revision++;state.sequence++;state.migrations=[...(state.migrations??[]),{from:known.digest,to:content.digest,revision:state.revision,reason:'战略编辑升级；保留人物、剧本、事件及历史，旧提案需重新审阅'}];for(const p of state.proposals)p.granted=false;await persist(state);
   }
   if(state.history.length===0&&state.proposals.length===0&&isDeepStrictEqual(state.document,m.projectDraft(state.base))){const {content,environment}=await getBundle();if(state.base.digest!==content.digest){state.base=content;state.environment=environment;state.document=m.projectDraft(content);state.sequence++;await persist(state);}}
   return state;}
  catch(e){if(e.code!=='ENOENT')throw e;if((await checkpoints()).length)fail('RECOVERY','主草稿缺失；发现恢复点，请先预览恢复，避免初始化覆盖。');const {content,environment}=await getBundle();const state={format:'fynbc-studio-v1',base:content,environment,document:m.projectDraft(content),revision:0,sequence:0,proposals:[],history:[],receipts:{}};await persist(state);return state;}
 }
 function proposal(s,id){const p=s.proposals.find(p=>p.id===id);if(!p)fail('MISSING','提案不存在。');return p;}
 function candidate(s,p){if(p.status!=='pending')fail('STATUS','提案已经处理。',null,409);if(p.baseRevision!==s.revision)fail('CONFLICT','工作区版本已变化，请重新读取并提交提案。',{expected:p.baseRevision,actual:s.revision},409);if(p.migration){m.assertDraft(p.migration.document,p.migration.base);return p.migration.document;}return m.applyOperations(s.document,s.base,p.operations);}
 function commit(s,p,next){
  const inverse=m.inverseOperations(s.document,next,s.base);
  if(p.migration){const from=s.base.digest;for(const h of s.history)h.baseDigest??=from;s.base=p.migration.base;s.environment=p.migration.environment;s.migrations=[...(s.migrations??[]),{from,to:s.base.digest,revision:s.revision+1,reason:p.title}];for(const other of s.proposals)other.granted=false;}
  // Undo creation/deletion uses the same semantic/reference checks as editing.
  s.document=next;s.revision++;p.status='applied';p.appliedRevision=s.revision;p.granted=false;
  const receipt={revision:s.revision,proposalId:p.id,title:p.title,actor:p.actor};s.history.push({...receipt,baseDigest:s.base.digest,operations:p.operations,inverse:p.migration?null:inverse});return receipt;
 }
 async function migrationPlan(s,input){if(input.resolutions&&Object.keys(input.resolutions).some(k=>!['local','incoming'].includes(k)))fail('FIELD','未知迁移冲突作用域');const target=await getBundle(),compiler=await realm.ssrLoadModule('/src/core/contentPackage.ts');const source=await migrationSource(input.source??makeBackup(s),{model:m,compiler,environment:target.environment,fallbackBase:s.base});
  // First rebase this workspace onto the current official base; both sets of
  // author edits then merge against the incoming author's original ancestor.
  const local=mergeDraft(m.projectDraft(s.base),s.document,m.projectDraft(target.content),input.resolutions?.local??{});
  const imported=input.source?mergeDraft(source.ancestor,source.document,local.document,input.resolutions?.incoming??{}):{document:local.document,conflicts:[]};
  const conflicts=[...local.conflicts.map(c=>({...c,scope:'local'})),...imported.conflicts.map(c=>({...c,scope:'incoming'}))];
  if(!conflicts.length)m.assertDraft(imported.document,target.content);
  const operations=m.inverseOperations(imported.document,s.document,s.base);if(operations.length>10000)fail('LIMIT','迁移超过 10000 项变更，请分包处理。');
  return {revision:s.revision,from:source.base.digest,to:target.content.digest,conflicts,operations,diagnostics:conflicts.length?[]:m.diagnose(imported.document,target.content),migration:{base:target.content,environment:target.environment,document:imported.document}};
 }
 async function compile(s,scenarioId){
  const {environment}=bundle??await compileOfficialPackage();if(s.environment.engine!==environment.engine||s.environment.assets!==environment.assets)fail('DEPENDENCY','基础规则或资产已经变化；保留当前草稿，请使用匹配版本后再编译。');
  const tables=m.compileDraftTables(s.document,s.base,scenarioId),compiler=await realm.ssrLoadModule('/src/core/contentPackage.ts');return {content:await compiler.compileContentPackage(tables,'studio-local',environment),environment};
 }
 async function verifiedImport(s,value,environment){
  const release=await verifyRelease(value,environment),compiler=await realm.ssrLoadModule('/src/core/contentPackage.ts');await migrationSource(release,{model:m,compiler,environment,fallbackBase:s.base});return release;
 }
 async function runPreview(s,input,compiled){
  const {content,environment}=compiled??await compile(s,input.scenarioId);let snapshot,receipt,host;
  const days=input.days??0;if(!Number.isSafeInteger(days)||days<0||days>7)fail('RANGE','试玩推进仅接受 0—7 日。');
  try{
   host=await openPackagePreview(content,environment,v=>{if(v.type==='world')snapshot=v;if(v.type==='receipt')receipt=v;});
   async function send(value){receipt=null;await host.dispatch({...value,requestId:randomUUID()});if(!receipt?.ok)fail('PREVIEW',receipt?.text??'试玩未返回回执。');}
   await send({type:'init'});await send({type:'new',scriptId:input.scenarioId,characterId:input.characterId??s.document.scenarios[input.scenarioId].defaultCharacter,mode:'sandbox'});
   for(let i=0;i<days;i++)await send({type:'step'});
   const handlers=await host.inspect('/src/core/eventHandlers.ts');const w=snapshot.world,saves=await host.inspect('/src/core/save.ts'),saved=saves.serializeWorld(w),loaded=saves.parseWorld(saved);if(JSON.stringify(loaded)!==JSON.stringify(w))fail('ROUNDTRIP','存档重载与当前世界不一致');return {saveRoundtrip:true,strategy:{cities:w.realm?.cities,treasuries:w.realm?.treasuries,armies:w.realm?.armies,armyCommanders:w.mobility?.armyCommanders,fiscal:w.realm?.fiscal,diplomacy:w.diplomacy?.pairs},eventHandlers:handlers.registeredEventDiagnostics(w),revision:s.revision,digest:content.digest,storage:'isolated-memory',day:w.day,characterId:w.characterId,person:w.people[0],governedCities:w.holdings.governedCities,identity:w.identities?.people[w.characterId],privateReserve:w.relationships?.reserves[w.characterId],chronicle:w.chronicle.slice(-6),actualOffices:Object.fromEntries(Object.entries(w.realm?.cities??{}).filter(([,c])=>c.governor===w.characterId).map(([id])=>[id,w.characterId]))};
  }finally{await host?.close();}
 }
 async function request(method,input={},actor='ai'){
  assertJSON(input,(largeMethods.includes(method)?16:1)*1024*1024);
  if(!['ai','human'].includes(actor))fail('ACTOR','未知调用方。');
  if(!Object.hasOwn(schemas,method)||!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!schemas[method].includes(k)))fail('REQUEST','未知请求字段、方法或作用域。');
  const mutating=['propose','apply','reject','grant','undo','debugEvent','proposeImport','proposeMigration','recover'].includes(method);
  if(mutating&&(typeof input.key!=='string'||!/^[a-zA-Z0-9:_-]{1,100}$/.test(input.key)))fail('KEY','写入必须带唯一幂等键。');
  return locked(async()=>{
   if(method==='recoveryStatus'){const raw=await rawState();let current;try{const s=raw===null?null:decodeState(raw);current=s?{revision:s.revision,sequence:s.sequence}:null;}catch(e){current={error:e.message};}return {current,checkpoints:await checkpoints()};}
   if(method==='recoveryPreview')return (await recoveryPreview(input.slot)).preview;
   if(method==='recover'){
    if(actor!=='human')fail('AUTH','工作区故障恢复仅可由人工界面确认；AI 可读取恢复预览。',null,403);
    const raw=await rawState(),fp=hash({method,input,actor});let current;try{current=raw===null?null:decodeState(raw);}catch{}const old=current?.receipts['human:'+input.key];if(old){if(old.fingerprint!==fp)fail('IDEMPOTENCY','此幂等键已用于另一请求。',null,409);return old.result;}
    const {state,preview}=await recoveryPreview(input.slot);if(preview.expectedState!==input.expectedState||preview.checkpointDigest!==input.checkpointDigest)fail('CONFLICT','主草稿或恢复点已变化，请重新预览。',null,409);
    const all=await checkpoints();state.revision=Math.max(state.revision,current?.revision??0,...all.map(c=>c.revision??0))+2;state.sequence=Math.max(state.sequence,current?.sequence??0,...all.map(c=>c.sequence??0))+2;for(const p of state.proposals)p.granted=false;
    const archive=raw===null?null:'recovered-original-'+randomUUID()+'.json';if(archive)await writeAtomic(archive,raw);const result={revision:state.revision,archive,grantsRevoked:true};state.receipts={['human:'+input.key]:{fingerprint:fp,result}};state.migrations=[...(state.migrations??[]),{reason:'人工恢复检查点',revision:state.revision,fromRevision:preview.revision}];await persist(state);return result;
   }
   const s=await load(),fingerprint=hash({method,input,actor}),receiptKey=actor+':'+input.key;
   if(mutating&&s.receipts[receiptKey]){const old=s.receipts[receiptKey];if(old.fingerprint!==fingerprint)fail('IDEMPOTENCY','此幂等键已用于另一请求。',null,409);return old.result;}
   let result;
   switch(method){
    case 'status':return {revision:s.revision,sequence:s.sequence};
    case 'schema':return {version:1,scope:'local-workspace',formats:{release:['v1','v2'],backup:['v1','v2'],runtime:'schema-1/three-realms-v1'},limits:{ordinaryBytes:1048576,importBytes:16777216,jsonDepth:64,jsonNodes:500000,operations:100,migrationChanges:10000,checkpoints:3},migrationPolicy:'three-way author merge; explicit conflict choices; human review or grant; old saves unchanged',methods:schemas,fields:m.fields,eventCapabilities:m.eventCapabilities,politicalCapabilities:m.politicalCapabilities,examples:{event:m.newEventDefinition('sample-event','示例事件',Object.keys(s.document.scenarios)[0]),eventTest:{id:'sample-event-test',name:'示例事件测试',eventId:'sample-event',scenarioId:Object.keys(s.document.scenarios)[0],characterId:Object.values(s.document.scenarios)[0].defaultCharacter,seed:546103,dayBudget:1,stepBudget:8,choices:[{stage:'decision',option:'relief'}],expectedStatus:'resolved'}},targets:Object.keys(m.fields),aiPolicy:'propose-first; human review or per-proposal grant required',operations:{target:'required',id:'required',scenarioId:'states only',field:'omit for create/delete',before:'required exact value',after:'required typed value'},atomicity:'one revision/document/history/receipt file'};
    case 'snapshot':return {revision:s.revision,sequence:s.sequence,document:s.document,proposals:s.proposals.map(({migration,...p})=>({...p,...(migration?{migration:{to:migration.base.digest}}:{})})),history:s.history,diagnostics:m.diagnose(s.document,s.base),sites:s.base.tables.scenario.sites.map(site=>({...site,...s.document.sites[site.id]})),territoryNodes:s.base.tables.territorialHierarchy.territoryNodes,boundaries:s.document.geography.map.boundaries.value??s.base.tables['territories.json'].value,baseDigest:s.base.digest,migrations:s.migrations??[],debugRuns:(s.debugRuns??[]).map(({content,initialState,...summary})=>summary),baseDocument:m.projectDraft(s.base),states:Object.fromEntries(Object.values(s.document.scenarios).map(sc=>[sc.id,Object.fromEntries(Object.keys(s.document.people).map(id=>[id,m.effectiveState(s.document,s.base,sc.id,id)]))]))};
    case 'backup':return makeBackup(s);
    case 'migrationPreview':{const {migration,...preview}=await migrationPlan(s,input);return preview;}
    case 'proposeMigration':{
     if(input.baseRevision!==s.revision)fail('CONFLICT','迁移所依据的版本已变化',null,409);const plan=await migrationPlan(s,input);if(plan.conflicts.length)fail('CONFLICT','请先逐项解决迁移冲突',plan.conflicts,409);if(!plan.operations.length&&plan.to===s.base.digest)fail('NO_CHANGE','没有实际迁移变更。');
     const p={id:randomUUID(),baseRevision:s.revision,title:'迁移／恢复作者草稿（原授权失效）',actor,operations:plan.operations,status:'pending',granted:false,migration:plan.migration};s.proposals.push(p);const {migration,...publicProposal}=p;result={...publicProposal,diagnostics:plan.diagnostics,migration:{to:plan.to}};break;
    }
    case 'search':{if(!Object.hasOwn(m.fields,input.target)||input.target==='states'||typeof input.query!=='string')fail('QUERY','无效搜索。');return Object.values(s.document[input.target]).filter(v=>(v.id+' '+v.name).includes(input.query)).map(({id,name})=>({id,name}));}
    case 'read':m.validEntityId(input.target,input.id,s.base);if(input.target==='states'){if(!s.document.people[input.id]||!s.document.scenarios[input.scenarioId])fail('REFERENCE','人物或剧本不存在。');return m.effectiveState(s.document,s.base,input.scenarioId,input.id);}if(!Object.hasOwn(m.fields,input.target)||input.target==='states')fail('SCOPE','不支持的读取作用域。');return s.document[input.target][input.id]??null;
    case 'references':m.validEntityId(input.target,input.id,s.base);if(!Object.hasOwn(m.fields,input.target)||input.target==='states')fail('SCOPE','不支持的引用作用域。');return m.references(s.document,s.base,input.target,input.id);
    case 'propose':{
     if(!Number.isSafeInteger(input.baseRevision)||input.baseRevision!==s.revision)fail('CONFLICT','基础版本已变化。',{expected:input.baseRevision,actual:s.revision},409);
     if(typeof input.title!=='string'||!input.title.trim()||input.title.length>200)fail('TITLE','提案须有 1—200 字标题。');
     const next=m.applyOperations(s.document,s.base,input.operations);const p={id:randomUUID(),baseRevision:s.revision,title:input.title,actor,operations:input.operations,status:'pending',granted:false};s.proposals.push(p);result={...p,diagnostics:m.diagnose(next,s.base)};break;
    }
    case 'preflight':{const p=proposal(s,input.proposalId);return {revision:s.revision,operations:p.operations,diagnostics:m.diagnose(candidate(s,p),p.migration?.base??s.base),canApply:actor==='human'||p.granted};}
    case 'apply':{const p=proposal(s,input.proposalId);if(p.migration&&p.migration.base.digest!==(bundle??await compileOfficialPackage()).content.digest)fail('DEPENDENCY','迁移目标基础已变化，请重新生成提案');if(actor!=='human'&&!p.granted)fail('AUTH','AI 提案尚未获得人工审阅或授权。',null,403);result=commit(s,p,candidate(s,p));break;}
    case 'grant':{if(actor!=='human')fail('AUTH','仅人工界面可授权指定提案。',null,403);const p=proposal(s,input.proposalId);candidate(s,p);p.granted=true;result={proposalId:p.id,granted:true,baseRevision:p.baseRevision};break;}
    case 'reject':{if(actor!=='human')fail('AUTH','仅人工界面可退回提案。',null,403);const p=proposal(s,input.proposalId);if(p.status!=='pending')fail('STATUS','提案已处理。');p.status='rejected';p.granted=false;result={proposalId:p.id,status:p.status};break;}
    case 'undo':{
     if(actor!=='human')fail('AUTH','AI 须把撤销作为反向提案提交。',null,403);
     if(input.baseRevision!==s.revision)fail('CONFLICT','撤销所依据的版本已变化。',null,409);
     const h=s.history.find(h=>h.revision===input.revision);if(!h)fail('MISSING','没有此已应用版本。');if(!h.inverse||h.baseDigest&&h.baseDigest!==s.base.digest)fail('MIGRATION','不能跨基础版本撤销；请导入迁移前备份并审阅。');
     const p={id:randomUUID(),baseRevision:s.revision,title:'撤销：'+h.title,actor,operations:h.inverse,status:'pending',granted:false};
     result=commit(s,p,candidate(s,p));s.proposals.push(p);break;
    }
    case 'copyScenario':return {revision:s.revision,operations:m.copyScenarioOperations(s.document,input.scenarioId,input.id,input.name)};
    case 'strategyTemplate':{
     const compiled=await compile(s,input.scenarioId),host=await openPackagePreview(compiled.content,compiled.environment);
     try{const world=await host.inspect('/src/core/world.ts'),setup=(await host.inspect('/src/data/campaignSetup.ts')).campaignSetup;const w=world.newCampaignWorld(s.document.scenarios[input.scenarioId].defaultCharacter,input.scenarioId,'sandbox');
      return s.document.scenarios[input.scenarioId].strategy??{wars:[],source:'作者剧本初始存量与设计假设；不是历史人口考据',cities:Object.fromEntries(Object.entries(w.realm.cities).map(([id,c])=>[id,{owner:c.owner,controller:c.controller,population:c.population,grain:c.grain,localCoins:0,order:c.order,prosperity:c.prosperity,irrigation:c.irrigation,fortification:c.fortification.level,source:'沿用基础开局参数；兵员在开局征募时另行扣除'}])),treasuries:Object.fromEntries(Object.entries(w.realm.treasuries).map(([id,t])=>[id,{coins:t.coins,grain:t.grain}])),armies:setup.armies.map((a,i)=>({id:'army-'+i,realm:a.realm,site:a.site,commander:a.commander??null,troops:setup.troops,grain:setup.grain,morale:setup.morale,experience:setup.experience,institution:setup.institution})),diplomacy:Object.values(w.diplomacy.pairs).map(p=>({a:p.a,b:p.b,opinion:p.opinion,recognized:p.recognized,treaties:[]})),administration:{}};
     }finally{await host.close();}
    }
    case 'generateBoundaries':{const g=await realm.ssrLoadModule('/src/studio/strategicModel.ts'),{sites}=g.geographicTables(s.document,s.base);const value=generateStudioBoundaries(sites,s.base.tables.administration.administration,s.base.tables.scenario.polities,JSON.parse(await readFile(join(projectRoot,'public/data/land.geojson'),'utf8')));return {revision:s.revision,before:s.document.geography.map.boundaries,after:value,changedSites:value.value.features.filter(f=>JSON.stringify(f.geometry)!==JSON.stringify((s.document.geography.map.boundaries.value??s.base.tables['territories.json'].value).features.find(b=>b.properties.id===f.properties.id)?.geometry)).map(f=>f.properties.id),note:'只生成预览；提交 boundaries 变更并审阅后才会替换当前几何。保留模式绝不自动重画。'};}
    case 'mapPreview':{const compiled=await compile(s,input.scenarioId),host=await openPackagePreview(compiled.content,compiled.environment);try{const map=(await host.inspect('/src/data/officialMap.ts')).officialMap,adj=await host.inspect('/src/data/territoryAdjacency.ts');const from=input.from??'jiankang',to=input.to??'jingkou';if(!map.getSite(from)||!map.getSite(to))fail('REFERENCE','路线端点不存在');return {revision:s.revision,route:map.planRoute(from,to),neighbors:[...adj.territoryNeighbors(from)],sites:compiled.content.tables.scenario.sites,roads:compiled.content.tables.scenario.roads,boundaries:compiled.content.tables['territories.json'].value,territoryNodes:compiled.content.tables.territorialHierarchy.territoryNodes};}finally{await host.close();}}
    case 'exportBundle':{const compiled=await compile(s,input.scenarioId);await runPreview(s,input,compiled);return makeRelease(s,compiled.content,input.scenarioId);}
    case 'importPreview':{const {environment}=bundle??await compileOfficialPackage(),release=await verifiedImport(s,input.release,environment);return runPreview({revision:s.revision,document:{scenarios:{[release.scenarioId]:{defaultCharacter:release.content.tables.scripts.gameScripts[0].defaultCharacter}}}},{scenarioId:release.scenarioId,days:input.days??0},{content:release.content,environment});}
    case 'proposeImport':{
     if(input.baseRevision!==s.revision)fail('CONFLICT','导入所依据的版本已变化',null,409);const {environment}=bundle??await compileOfficialPackage(),release=await verifiedImport(s,input.release,environment);
     if(release.authoring?.baseDigest!==s.base.digest)fail('DEPENDENCY','导入草稿的基础包不匹配；可使用隔离重载检查内容包');
     const operations=m.inverseOperations(release.authoring.document,s.document,s.base),next=m.applyOperations(s.document,s.base,operations),copy={...s,document:next};const compiled=await compile(copy,release.scenarioId);if(compiled.content.digest!==release.content.digest)fail('IMPORT','导入作者草稿与运行内容包不一致');
     const p={id:randomUUID(),baseRevision:s.revision,title:'导入并审阅：'+next.scenarios[release.scenarioId].name,actor,operations,status:'pending',granted:false};s.proposals.push(p);result={...p,diagnostics:m.diagnose(next,s.base)};break;
    }
    case 'debugReport':{const report=s.debugRuns?.find(r=>r.id===input.id);if(!report)fail('MISSING','调试记录不存在或已超出最近 3 次保留范围。');return report;}
    case 'debugEvent':{
     if(input.baseRevision!==s.revision)fail('CONFLICT','调试所依据的版本已变化。',null,409);
     const test=structuredClone(s.document.eventTests[input.testId]);if(!test)fail('MISSING','请先保存事件测试用例。');if(input.choices!==undefined)test.choices=input.choices;m.assertEventTest(test);
     if(!s.document.scenarios[test.scenarioId])fail('REFERENCE','测试剧本不存在。',{fieldPath:'eventTests.'+test.id+'.scenarioId'});
     const copy=structuredClone(s);copy.document.eventTests[test.id]=test;copy.document.scenarios[test.scenarioId].seed=test.seed;
     const compiled=await compile(copy,test.scenarioId),report=JSON.parse(JSON.stringify(await debugStudioEvent({...compiled,test,revision:s.revision})));
     s.debugRuns=[...(s.debugRuns??[]).slice(-2),report];const {content,initialState,...summary}=report;result=summary;break;
    }
    case 'check':{const issues=m.diagnose(s.document,s.base,input.scenarioId);if(issues.length)return {revision:s.revision,diagnostics:issues};const compiled=await compile(s,input.scenarioId);const preview=await runPreview(s,input,compiled);return {revision:s.revision,digest:compiled.content.digest,diagnostics:[],reviewChecklist:[{item:'类型、引用、行政层级、道路连通',status:'passed'},{item:'实际开局：任职、统帅、来源兵额、钱粮与拨款',status:'passed'},{item:'存档序列化与重载',status:preview.saveRoundtrip?'passed':'failed'},{item:'短事件各分支',status:'run-saved-event-tests'},{item:'前端视觉与操作',status:'awaiting-human-review'}]};}
    case 'export':{const compiled=await compile(s,input.scenarioId);await runPreview(s,input,compiled);return compiled.content;}
    case 'preview':return runPreview(s,input);
   }
   s.sequence++;s.receipts[receiptKey]={fingerprint,result};await persist(s);return result;
  });
 }
 return {request,close:async()=>{closed=true;await realm.close();}};
}
