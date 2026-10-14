import {authoredEventDefinitions} from '../data/authoredEvents';
import {getPerson} from './personRegistry';
import type {World} from './types';
const object=(v:unknown,keys:string[])=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const integer=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
export function validAuthoredEvents(w:World){
 const s=w.authoredEvents;if(s===undefined)return true;
 try{
  if(!object(s,['version','seed','lastChecks','runs','lastEnded','instances'])||s.version!==1||!integer(s.seed,0,0xffffffff)||!Array.isArray(s.instances)||s.instances.length>1000)return false;
  const defs=new Map(authoredEventDefinitions.map(d=>[d.id,d]));
  for(const key of ['lastChecks','runs','lastEnded'] as const){const map=s[key];if(!map||typeof map!=='object'||Array.isArray(map)||Object.entries(map).some(([id,n])=>!defs.has(id)||!integer(n,key==='runs'?1:0,key==='runs'?defs.get(id)!.maxRuns:w.day)))return false;}
  const ids=new Set<string>();
  for(const i of s.instances){const d=defs.get(i.definitionId),stage=d?.stages.find(x=>x.id===i.stage);
   if(!object(i,['id','definitionId','actor','site','stage','revision','status','created','entered','ended','lastNpcDay','receipts','reason'])||!d||!stage||!d.enabled||!d.scenarioIds.includes(w.scriptId??'')||i.site!==d.site||!getPerson(w,i.actor)||ids.has(i.id)||typeof i.reason!=='string'||i.reason.length>500||!['active','resolved','cancelled','expired','invalid'].includes(i.status))return false;
   ids.add(i.id);if(!integer(i.created,0,w.day)||!integer(i.entered,i.created,w.day)||!integer(i.lastNpcDay,-1,w.day)||!integer(i.revision,0,12)||!Array.isArray(i.receipts)||i.receipts.length!==i.revision||(i.status==='active'?i.ended!==null:!integer(i.ended,i.entered,w.day)))return false;
   let expected=d.startStage,day=i.created,entered=i.created,terminal=false;
   for(const [index,r] of i.receipts.entries()){const st=d.stages.find(x=>x.id===expected),op=st?.options.find(x=>x.id===r.option);
    if(!object(r,['revision','stage','option','day','effects'])||r.revision!==index||r.stage!==expected||!op||!integer(r.day,day,w.day)||!Array.isArray(r.effects)||r.effects.length!==op.actions.length)return false;
    for(const [j,e] of r.effects.entries()){const a=op.actions[j];if(!object(e,['action','coins','order','requests'])||e.action!==a.kind||!Array.isArray(e.requests)||e.requests.some(n=>!integer(n,1,Number.MAX_SAFE_INTEGER)))return false;if(a.kind==='fiscalRelief'?(e.coins!==-20||!integer(e.order,1,8)||e.requests.length!==0):(e.coins!==0||e.order!==0||e.requests.length!==1))return false;}
    if(op.next){expected=op.next;entered=r.day;}else {terminal=true;if(index!==i.receipts.length-1||i.status!==(op.cancel?'cancelled':'resolved'))return false;}day=r.day;
   }
   if(i.stage!==expected||i.entered!==entered||!terminal&&['resolved','cancelled'].includes(i.status)||(s.lastChecks[d.id]??-1)<i.created)return false;
  }
  for(const d of authoredEventDefinitions){const instances=s.instances.filter(i=>i.definitionId===d.id),runs=s.runs[d.id]??0;if(instances.length!==runs||instances.some((i,n)=>i.id!==`event:${d.id}:${n+1}`)||instances.filter(i=>i.status==='active').length>1)return false;const ended=instances.filter(i=>i.ended!==null);if(ended.length?(s.lastEnded[d.id]!==Math.max(...ended.map(i=>i.ended!))):Object.hasOwn(s.lastEnded,d.id))return false;}
  return true;
 }catch{return false;}
}
