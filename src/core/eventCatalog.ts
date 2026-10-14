import type {World} from './types';
import type {RealmId} from './realm';
import {reformIds,reformDefinitions,successionIds,successionDefinitions,dynastyNames} from '../data/governments';
import {governmentOf,governmentReason,governmentYear,governmentTaskPause,governingExecutives,governingAuthority,regimeName} from './government';
import {allegianceRealm} from './officeEligibility';
import {getPerson} from './personRegistry';
import {historicalTitle,historicalPact,visibleHistoricalMilestones,historicalPending} from './historicalEvents';
import {currentPactBreaches,receptionNames} from './allegiancePacts';

export const eventStatusNames={dormant:'未开启',available:'可办理',active:'进行中',resolved:'已结束',cancelled:'已中止',initial:'开局已行',unavailable:'本局不适用',unknown:'消息未明'} as const;
export type EventStatus=keyof typeof eventStatusNames;
export const eventGroupNames={event:'事件卷宗',succession:'权力沿革',reform:'制度沿革'} as const;
export interface CatalogEntry {
 id:string;name:string;group:keyof typeof eventGroupNames;status:EventStatus;chapter:string;summary:string;
 realm?:RealmId;people:string[];site?:string;war?:number;pending:boolean;
 facts:{label:string;text:string}[];history:{key:string;day:number;text:string}[];
 reference:string;source:{title:string;url:string};deadline?:{day:number;label:string;note:string};
 progress?:{value:number;max:number;pause:string};action?:{kind:'historical'|'succession'|'reform';target:string;label:string};
}

/** Read-only projection: catalog discovery never creates an event, advances time or grants authority. */
export function eventCatalog(w:World):CatalogEntry[]{
 const result:CatalogEntry[]=[],actor=w.characterId,own=actor?allegianceRealm(w,actor):undefined;
 const e=w.historical?.items.find(v=>v.definitionId==='hou-jing');
 const hou:CatalogEntry={id:'hou-jing',name:'侯景之乱',group:'event',status:'dormant',chapter:'尚未开启',summary:'侯景的处境随实际军权、保护关系及朝局变化发展，不保证起兵。',people:['hou-jing','gao-huan'],pending:false,facts:[],history:[],reference:'侯景在东魏掌兵，后请求归附梁，最终举兵。此处仅作史实参照；本局是否交涉、起兵与围城，均取决于实际局势，不按史实日期强制发生。',source:{title:'《梁书》卷五十六·侯景',url:'https://zh.wikisource.org/wiki/梁書/卷56'}};
 if(w.mode!=='sandbox'||!w.realm||!getPerson(w,'hou-jing')){hou.status='unavailable';hou.summary='当前模式或剧本不适用这条事件链。';}
 else if(e){
  const milestones=visibleHistoricalMilestones(w,e),last=e.milestones.at(-1),p=historicalPact(w,e);
  const insider=actor===e.actors.protagonist||!!actor&&[e.origin,...(e.host?[e.host]:[])].some(r=>governingExecutives(w,r).includes(actor));
  // Old public news must not disclose a later private phase, result, deadline or location.
  const current=insider||!!last&&milestones.some(m=>m.key===last.key);
  hou.history=milestones.map(m=>({key:m.key,day:m.day,text:m.text}));
  hou.people=[...new Set([...hou.people,...milestones.flatMap(m=>m.people)])].filter(id=>!!getPerson(w,id));
  hou.pending=historicalPending(w).some(v=>v.historicalId===e.id);
  if(!current&&!insider){hou.status='unknown';hou.chapter='当前进展未明';hou.summary=milestones.at(-1)?.text??'尚无当前身份可知的事件消息。';}
  else {
   hou.status=e.status==='resolved'?'resolved':e.status==='cancelled'?'cancelled':e.phase==='dormant'?'dormant':'active';
   hou.chapter=historicalTitle(w,e);hou.site=e.site;hou.realm=e.host??e.origin;
   if(e.status==='active'){const chief=governingAuthority(w,e.host??e.origin);hou.people=[...new Set([e.actors.protagonist,...(chief?[chief]:[]),e.actors.protector,...hou.people])].filter(id=>!!getPerson(w,id));}
   hou.summary=e.result??milestones.at(-1)?.text??hou.summary;
   const pactVisible=p&&!!actor&&(p.person===actor||governingExecutives(w,p.to).includes(actor));
   if(pactVisible){hou.facts.push({label:'归附约定',text:receptionNames[p.terms]},{label:'当前争议',text:p.status==='active'?currentPactBreaches(w,p).join('、')||'暂无未解争议':p.status==='pending'?'等待接纳方答复':'交涉已结束'});}
   if(e.status==='active'&&insider){
    const day=pactVisible?(p.offer?.expiresAt??(p.status==='pending'?p.due:e.handlingDue)):e.handlingDue;
    if(day!==undefined)hou.deadline={day,label:pactVisible&&p.offer?'新条款答复期限':pactVisible&&p.status==='pending'?'来书答复期限':'处理窗口',note:'届期按实际局势重新评估，不代表必然起兵。'};
    if(e.phase!=='dormant')hou.action={kind:'historical',target:e.id,label:'前往交涉与处置'};
   }
   if(e.warId!==undefined&&current)hou.war=e.warId;
  }
 }
 result.push(hou);
 for(const group of ['succession','reform'] as const){
  for(const id of group==='succession'?successionIds:reformIds){
   const succession=group==='succession'?successionDefinitions[id as keyof typeof successionDefinitions]:undefined;
   const reform=group==='reform'?reformDefinitions[id as keyof typeof reformDefinitions]:undefined;
   const d=(succession??reform)!,r=d.realm,g=governmentOf(w,r);
   const records=(w.realm?.governments?.history??[]).filter(v=>v.realm===r&&v.target===id);
   const entry:CatalogEntry={id:group+':'+id,name:d.name.replace('，建立北齐','').replace('，建立北周','').replace('，建立陈朝',''),group,status:'dormant',chapter:regimeName(w,r),realm:r,summary:'尚未开启。',people:succession?[...new Set([succession.ruler,...succession.executives])]:[],pending:false,facts:[],history:records.map((v,i)=>({key:String(i),day:v.day,text:v.text})),reference:d.history,source:d.source};
   if(succession?.nextDynasty)entry.chapter=dynastyNames[r]+' → '+dynastyNames[succession.nextDynasty];
   if(reform){entry.facts.push({label:'制度效果',text:reform.effect});if(!reform.initial)entry.facts.push({label:'启动成本',text:`${regimeName(w,r)}中央公款 ${reform.cost} 钱、本人影响力 40；朝野支持 −12`},{label:'办理时间',text:`${reform.days} 个有效实施日，不含受阻等待`});}
   const task=g?.task?.target===id?g.task:undefined,proposal=w.politics?.proposals[r];
   const matching=succession&&proposal?.sourceStage===id?proposal:undefined;
   const proposalVisible=matching&&(matching.stage!=='support'||[matching.sponsor,matching.beneficiary,matching.executive,...Object.keys(matching.approached)].includes(actor??''));
   const done=reform?g?.laws.includes(id as typeof reformIds[number]):g?.stages.includes(id as typeof successionIds[number]);
   if(w.mode!=='sandbox'||!g){entry.status='unavailable';entry.summary='当前模式或剧本未提供此沿革。';}
   else if(done){entry.status=reform?.initial?'initial':'resolved';entry.summary=reform?.initial?'开局已施行的制度背景。':'本局已完成此沿革；后续权力变化不会抹去这项记录。';}
   else if(w.realm?.annexed?.[r]||succession&&g.dynasty!==r){entry.status='unavailable';entry.summary='原政权或国统已变化，此历史沿革不再适用。';}
   else if(task){entry.status='active';entry.summary=governmentTaskPause(w,r)||'议程正在实施。';entry.progress={value:task.progress,max:task.required,pause:governmentTaskPause(w,r)};entry.people.push(task.sponsor);}
   else if(matching&&proposalVisible){entry.status='active';entry.summary=matching.stage==='support'?'正在争取支持，尚未公开呈请。':matching.stage==='presented'?'已公开呈请，等待有权者答复。':'呈请遭到拒绝，议案尚未结束。';entry.people.push(matching.sponsor);entry.history.push({key:'proposal',day:matching.started,text:'本次权力议案开始交涉。'});entry.pending=actor===matching.sponsor||matching.stage==='presented'&&!!actor&&(g.ruler===actor||governingExecutives(w,r).includes(actor));}
   else if(succession&&governmentYear(w)>=d.year&&own!==r){entry.status='unknown';entry.summary='尚无可确认的公开沿革进展；未公开交涉不在此披露。';}
   else if(matching){entry.status='unknown';entry.summary='尚无当前身份可知的议案进展。';}
   else if(records.at(-1)?.kind==='cancel'){entry.status='cancelled';entry.summary=records.at(-1)!.text;}
   else {
    const reason=governmentYear(w)<d.year?`${d.year} 年起开放；年份到来不代表自动发生。`:own!==r?'须由所属政权有权人物办理。':governmentReason(w,succession?{type:'government',action:'succession',stage:id as typeof successionIds[number]}:{type:'government',action:'law',law:id as typeof reformIds[number]});
    entry.status=reason?'dormant':'available';entry.summary=reason||'当前人物可以提出此议案；仍需按实际程序办理。';
   }
   if(succession&&g)entry.facts.push({label:'当前君主',text:getPerson(w,g.ruler)?.name??'未详'},{label:'当前执政',text:governingExecutives(w,r).map(id=>getPerson(w,id)?.name??'未详').join('、')||'当前无人履职'});
   if(g&&w.mode==='sandbox'&&!w.realm?.annexed?.[r]&&(group==='reform'||own===r&&(!matching||proposalVisible)))entry.action={kind:group,target:id,label:group==='reform'?'查看制度与办理':'查看朝廷与议案'};
   entry.people=[...new Set(entry.people)].filter(id=>!!getPerson(w,id));result.push(entry);
  }
 }
 return result;
}

export function filterCatalog(entries:CatalogEntry[],query:string,status:EventStatus|'all',w:World){
 const q=query.trim().toLocaleLowerCase();
 const rank:Record<EventStatus,number>={active:1,available:2,dormant:3,unknown:4,resolved:5,cancelled:6,initial:7,unavailable:8};
 return entries.filter(e=>(status==='all'||e.status===status)&&(!q||[e.name,e.chapter,e.realm&&dynastyNames[e.realm],...e.people.map(id=>getPerson(w,id)?.name)].join(' ').toLocaleLowerCase().includes(q))).sort((a,b)=>Number(b.pending)-Number(a.pending)||rank[a.status]-rank[b.status]);
}
