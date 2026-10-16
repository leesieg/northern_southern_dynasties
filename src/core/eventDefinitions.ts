/** Public, finite authoring contract. No expressions or executable source. */
export const eventCapabilities={
 version:1,
 selectors:{player:'当前玩家',person:'指定人物',governor:'目标县治现任主官'},
 conditions:{yearAtLeast:{name:'公历年不早于',value:{min:100,max:9999}},alive:{name:'执行者在世',value:null},authority:{name:'具有目标地办理权',value:null},present:{name:'执行者位于目标地',value:null},dayAtLeast:{name:'世界日不早于',value:{min:0,max:3650}},orderBelow:{name:'地方秩序低于',value:{min:1,max:101}},localCoinsAtLeast:{name:'地方公库至少',value:{min:0,max:1000000}},noPendingGrant:{name:'当地没有待批拨款',value:null}},
 actions:{relocateCourt:{name:'迁驻朝廷',description:'须实际执政者已抵达并控制目标县域。中央公库支出 100 钱，使团、公务和补给按新驻地办理。',amount:null},fiscalRelief:{name:'平粜赈济',description:'调用既有公款规则，地方公库支出 20 钱，秩序至多增加 8；费用与资格由实际规则复核。',amount:null},requestGrant:{name:'申请地方拨款',description:'以真实县级主官身份向当前上级申请赈济预算；不自动批准、不预支到账。',amount:{min:20,max:400}}},
 native:[{id:'hou-jing',name:'侯景事件',handler:'historical-v1',editable:false,description:'沿用现有阶段、交涉、战争与收尾，作者不能用通用动作绕过专用规则。'}],
 limits:{definitions:50,stages:12,options:6,actions:6,conditions:12,runs:20},
} as const;
export type Condition={kind:keyof typeof eventCapabilities.conditions;value?:number};
export type EventAction={kind:'relocateCourt'}|{kind:'fiscalRelief'}|{kind:'requestGrant';amount:number};
export function newEventAction(kind:EventAction['kind']):EventAction{if(!Object.hasOwn(eventCapabilities.actions,kind))throw new Error('未注册行动');return kind==='requestGrant'?{kind,amount:40}:{kind};}
export interface EventOption {id:string;title:string;description:string;conditions:Condition[];actions:EventAction[];next:string|null;cancel:boolean;npcWeight:number}
export interface EventStage {id:string;title:string;body:string;delayDays:number;timeoutDays:number;options:EventOption[]}
export interface EventDefinition {id:string;name:string;description:string;enabled:boolean;scenarioIds:string[];actor:{kind:'player'|'person'|'governor';personId:string|null};site:string;requiresAuthority:boolean;conditions:Condition[];probability:number;cooldownDays:number;maxRuns:number;startStage:string;stages:EventStage[]}
export interface EventTest {id:string;name:string;eventId:string;scenarioId:string;characterId:string;seed:number;dayBudget:number;stepBudget:number;choices:{stage:string;option:string}[];expectedStatus:'resolved'|'cancelled'|'expired'|'invalid'}
export interface EventIssue {entityId:string;fieldPath:string;message:string;code:string;severity:'error'}
const own=(o:object,k:string)=>Object.hasOwn(o,k);
const id=(v:unknown):v is string=>typeof v==='string'&&/^[a-z][a-z0-9:_-]{0,79}$/.test(v)&&!['constructor','prototype','__proto__'].includes(v);
const integer=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const text=(v:unknown,max:number)=>typeof v==='string'&&v.length>0&&v.length<=max&&!v.includes('\0');
function object(value:unknown,keys:string[],path:string):asserts value is Record<string,any>{if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!keys.includes(k))||keys.some(k=>!own(value,k)))throw new Error(path+'：字段缺失或含未知字段。');}
function check(ok:unknown,path:string,message='字段类型或范围无效'):asserts ok{if(!ok)throw new Error(path+'：'+message);}
function list(v:unknown,max:number,path:string):asserts v is any[]{check(Array.isArray(v)&&v.length<=max,path);}
function conditions(v:unknown,path:string){list(v,12,path);v.forEach((c,i)=>{const p=path+'.'+i;check(c&&typeof c==='object'&&own(eventCapabilities.conditions,c.kind),p,'未知条件');const spec=eventCapabilities.conditions[c.kind as Condition['kind']];object(c,spec.value?['kind','value']:['kind'],p);if(spec.value)check(integer(c.value,spec.value.min,spec.value.max),p+'.value');});}
export function assertEventShape(value:unknown):asserts value is EventDefinition{
 object(value,['id','name','description','enabled','scenarioIds','actor','site','requiresAuthority','conditions','probability','cooldownDays','maxRuns','startStage','stages'],'events');
 check(id(value.id),'id');check(text(value.name,120),'name');check(typeof value.description==='string'&&value.description.length<=2000,'description');check(typeof value.enabled==='boolean','enabled');check(typeof value.requiresAuthority==='boolean','requiresAuthority');
 list(value.scenarioIds,50,'scenarioIds');check(value.scenarioIds.every(id)&&new Set(value.scenarioIds).size===value.scenarioIds.length,'scenarioIds');object(value.actor,['kind','personId'],'actor');check(own(eventCapabilities.selectors,value.actor.kind),'actor.kind');check(value.actor.kind==='person'?id(value.actor.personId):value.actor.personId===null,'actor.personId');check(id(value.site),'site');conditions(value.conditions,'conditions');
 check(integer(value.probability,0,100),'probability');check(integer(value.cooldownDays,1,365),'cooldownDays');check(integer(value.maxRuns,1,20),'maxRuns');check(id(value.startStage),'startStage');list(value.stages,12,'stages');check(value.stages.length>0,'stages');
 for(const [i,s] of value.stages.entries()){const p='stages.'+i;object(s,['id','title','body','delayDays','timeoutDays','options'],p);check(id(s.id),p+'.id');check(text(s.title,120),p+'.title');check(text(s.body,2000),p+'.body');check(integer(s.delayDays,0,30),p+'.delayDays');check(integer(s.timeoutDays,1,60),p+'.timeoutDays');list(s.options,6,p+'.options');
  for(const [j,o] of s.options.entries()){const q=p+'.options.'+j;object(o,['id','title','description','conditions','actions','next','cancel','npcWeight'],q);check(id(o.id),q+'.id');check(text(o.title,120),q+'.title');check(typeof o.description==='string'&&o.description.length<=1000,q+'.description');conditions(o.conditions,q+'.conditions');check(o.next===null||id(o.next),q+'.next');check(typeof o.cancel==='boolean',q+'.cancel');check(integer(o.npcWeight,0,100),q+'.npcWeight');list(o.actions,6,q+'.actions');
   for(const [k,a] of o.actions.entries()){const r=q+'.actions.'+k;check(a&&typeof a==='object'&&own(eventCapabilities.actions,a.kind),r,'未注册的行动');object(a,a.kind==='requestGrant'?['kind','amount']:['kind'],r);if(a.kind==='requestGrant')check(integer(a.amount,20,400),r+'.amount');}
  }
 }
}
export function assertEventTest(value:unknown):asserts value is EventTest{
 object(value,['id','name','eventId','scenarioId','characterId','seed','dayBudget','stepBudget','choices','expectedStatus'],'eventTests');for(const k of ['id','eventId','scenarioId','characterId'])check(id(value[k]),k);check(text(value.name,120),'name');check(integer(value.seed,1,0xffffffff),'seed');check(integer(value.dayBudget,0,7),'dayBudget');check(integer(value.stepBudget,1,32),'stepBudget');check(['resolved','cancelled','expired','invalid'].includes(value.expectedStatus),'expectedStatus');list(value.choices,24,'choices');for(const c of value.choices){object(c,['stage','option'],'choices');check(id(c.stage)&&id(c.option),'choices');}
}
export function eventDefinitionIssues(defs:EventDefinition[],refs:{people:Set<string>;sites:Set<string>;scenarios:Set<string>}):EventIssue[]{
 const issues:EventIssue[]=[],seen=new Set<string>(),add=(d:EventDefinition,path:string,message:string)=>issues.push({entityId:d.id,fieldPath:'events.'+d.id+'.'+path,message,code:'EVENT',severity:'error'});
 if(defs.length>50)throw new Error('事件定义最多 50 项。');
 for(const d of defs){assertEventShape(d);if(seen.has(d.id)||d.id==='hou-jing')add(d,'id','重复或保留的事件 ID。');seen.add(d.id);if(!refs.sites.has(d.site))add(d,'site','目标地点不存在。');if(d.actor.kind==='person'&&!refs.people.has(d.actor.personId!))add(d,'actor.personId','执行者不存在。');for(const id of d.scenarioIds)if(!refs.scenarios.has(id))add(d,'scenarioIds','剧本不存在：'+id);if(!d.scenarioIds.length)add(d,'scenarioIds','至少指定一个适用剧本。');
  const stages=new Map(d.stages.map(s=>[s.id,s]));if(stages.size!==d.stages.length)add(d,'stages','阶段 ID 重复。');if(!stages.has(d.startStage))add(d,'startStage','起始阶段不存在。');
  for(const [i,s] of d.stages.entries()){if(s.delayDays>=s.timeoutDays)add(d,`stages.${i}.timeoutDays`,'超时须晚于阶段开放日。');if(new Set(s.options.map(o=>o.id)).size!==s.options.length)add(d,`stages.${i}.options`,'同阶段选项 ID 重复。');for(const [j,o] of s.options.entries()){if(o.next&&!stages.has(o.next))add(d,`stages.${i}.options.${j}.next`,'下一阶段不存在。');if(o.cancel&&(o.actions.length||o.next))add(d,`stages.${i}.options.${j}`,'取消只能终止后续阶段，不能携带行动或下一阶段。');}}
  const visiting=new Set<string>(),done=new Set<string>();function walk(id:string){if(visiting.has(id)){add(d,'stages','短事件链不允许循环。');return;}if(done.has(id))return;visiting.add(id);for(const o of stages.get(id)?.options??[])if(o.next)walk(o.next);visiting.delete(id);done.add(id);}walk(d.startStage);for(const s of d.stages)if(!done.has(s.id))add(d,'stages','不可达阶段：'+s.id);
 }
 return issues;
}
export function newEventDefinition(id:string,name:string,scenarioId:string,site='jiankang'):EventDefinition{return {id,name,description:'作者设定事件。',enabled:false,scenarioIds:[scenarioId],actor:{kind:'player',personId:null},site,requiresAuthority:true,conditions:[{kind:'alive'},{kind:'authority'},{kind:'orderBelow',value:90}],probability:100,cooldownDays:30,maxRuns:1,startStage:'decision',stages:[{id:'decision',title:name,body:'地方呈报需要处理，请按当前情势作出决定。',delayDays:0,timeoutDays:7,options:[{id:'relief',title:'平粜赈济',description:'以地方公库支付平粜赈济。',conditions:[],actions:[{kind:'fiscalRelief'}],next:null,cancel:false,npcWeight:80},{id:'decline',title:'暂缓办理',description:'结束本次事件，已执行的事项不会回退。',conditions:[],actions:[],next:null,cancel:true,npcWeight:20}]}]};}
