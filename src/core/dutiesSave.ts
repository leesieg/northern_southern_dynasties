import {characterById} from '../data/characters';
import {dutyPlans,dutyPhaseNames} from './duties';
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const int=(v:unknown,min:number,max:number):v is number=>Number.isInteger(v)&&Number(v)>=min&&Number(v)<=max;
export function validDuties(v:unknown,day:number,mode:unknown):boolean{
 if(mode!=='sandbox'||!obj(v)||v.version!==1||!int(v.since,0,day)||!int(v.lastDay,v.since,day))return false;
 if(v.task===null)return true;
 const t=v.task;
 if(!obj(t)||t.id!=='tianshui-relief'||!int(t.created,v.since,day)||!int(t.changed,t.created,day)||t.deadline!==t.created+120||typeof t.officer!=='string'||!Object.hasOwn(characterById,t.officer)||characterById[t.officer].polity!=='west')return false;
 if(typeof t.phase!=='string'||!Object.hasOwn(dutyPhaseNames,t.phase)||t.plan!==null&&(typeof t.plan!=='string'||!Object.hasOwn(dutyPlans,t.plan)))return false;
 if(!int(t.required,0,10000)||!int(t.progress,0,t.required)||typeof t.started!=='boolean'||typeof t.incidentDone!=='boolean'||typeof t.aidRequested!=='boolean'||!obj(t.funds))return false;
 const p=t.plan===null?null:dutyPlans[t.plan as keyof typeof dutyPlans];
 if(!int(t.funds.coins,0,80)||!int(t.funds.grain,0,120))return false;
 const funded=t.funds.coins>0;
 if(funded&&(!p||t.funds.grain!==p.grain||![p.coins,p.coins+20].includes(t.funds.coins)))return false;
 if(!funded&&t.funds.grain!==0||t.funds.coins===(p?.coins??1000)+20&&!t.aidRequested)return false;
 if(t.started&&(!funded||t.required<1)||!t.started&&(t.required!==0||t.progress!==0||t.incidentDone||t.aidRequested))return false;
 if(t.phase==='proposal'&&(t.plan!==null||funded)||t.phase==='approval'&&(!p||funded)||t.phase==='ready'&&(!funded||t.started))return false;
 if(['working','incident','aid','report'].includes(t.phase)&&!t.started)return false;
 if(['incident','aid'].includes(t.phase)&&(t.plan!=='convoy'||t.incidentDone)||t.phase==='aid'&&!t.aidRequested)return false;
 if(t.phase==='report'&&t.progress!==t.required)return false;
 if(t.phase==='closed'){
  const r=t.result;
  if(!obj(r)||!int(r.day,t.created,day)||r.day!==t.changed||typeof r.success!=='boolean'||typeof r.reason!=='string'||r.reason.length>200||r.returned!==!t.started||r.merit!==(r.success?20:0)||r.opinion!==(r.success?12:-8))return false;
  if(r.success&&(!t.started||t.progress!==t.required))return false;
 }else if(t.result!==null)return false;
 if(!Array.isArray(t.history)||t.history.length<1||t.history.length>40)return false;
 let previous=t.created;
 for(const h of t.history){if(!obj(h)||!int(h.day,previous,day)||typeof h.text!=='string'||h.text.length<1||h.text.length>500)return false;previous=h.day;}
 return true;
}
