import type {World} from '../core/types';
import {eventCatalog} from '../core/eventCatalog';
import {activeWars,type War} from '../core/wars';
import {warArmySide,warCitySide} from '../core/civilWars';
import {militaryArmyView} from '../core/militaryView';
import {civilAvailability,civilStanceNames} from '../core/civilMobilization';
import {civilCommitments} from '../core/civilPromises';
import {armyCommander} from '../core/mobility';
import {personResidence} from '../core/residence';
import {personSheetPresentation} from './personSheetPresentation';
import {powerGoalNames} from '../core/powerPolitics';
import {politicalName,governmentOf} from '../core/government';
import {siteById} from '../data/scenario';
import type {DialogScene} from './DialogArt';

/** Presentation only: the event catalog remains the authority for visible news. */
export function houJingPresentation(w:World){
 const entry=eventCatalog(w).find(e=>e.id==='hou-jing')!;
 const known=!['unknown','unavailable'].includes(entry.status);
 const event=known?w.historical?.items.find(e=>e.definitionId==='hou-jing'):undefined;
 const war=entry.war===undefined?undefined:activeWars(w).find(v=>v.id===entry.war&&v.civil?.claimant==='hou-jing');
 const document=entry.action?.kind==='historical'&&event?.id===entry.action.target?event:undefined;
 const member=war?.civil?.mobilization?.members[w.characterId!];
 const stanceDue=member?.choice==='pending'&&!member.unavailable&&war&&!civilAvailability(w,war,w.characterId!)?member.due:undefined;
 const commitments=entry.war===undefined?[]:civilCommitments(w).filter(q=>q.civil.war===entry.war&&(q.person===w.characterId||q.chief===w.characterId));
 const outstanding=commitments.filter(q=>q.civil.status==='active'&&q.civil.due!==null).sort((a,b)=>a.civil.due!-b.civil.due!);
 const deadline=stanceDue!==undefined?{day:stanceDue,label:'本人表态期限',note:'届期保持原效忠，转为观望守土。'}:entry.deadline??(!war&&outstanding[0]?{day:outstanding[0].civil.due!,label:'待遇履约期限',note:'依照已接受约定核对实际职权；未兑现时按原规则处理。'}:undefined);
 const target=war?siteById[war.target]?.name:undefined;
 const control=war?warCitySide(w,war,war.target):null;
 const besieged=!!war&&w.realm?.sieges?.some(s=>s.war===war.id&&s.site===war.target);
 const waiting:string[]=[];
 if(entry.status==='unknown')waiting.push('当前进展未明；等待新的公开消息。');
 else if(entry.status==='unavailable')waiting.push('当前模式或剧本不适用这条事件链。');
 else if(entry.status==='resolved'||entry.status==='cancelled')waiting.push(entry.status==='resolved'?'本次事态已经结束。':'本次事态已经中止。');
 else if(war){
  waiting.push(control==='attack'?target+'已由起兵方控制':control!=='defend'?target+'现由第三方控制':besieged?target+'正在围城':target+'尚未形成围城');
  if(war.civil?.mobilization)waiting.push(stanceDue!==undefined?'待本人选择战时立场':'地方官将分别决定勤王、响应或观望');
  waiting.push(entry.pending?'待本人办理事件文书':stanceDue===undefined?'当前无待本人裁决事项':'表态前可先查阅兵地交接后果');
 }else if(entry.pending)waiting.push('待本人办理事件文书。');
 else {
  const dispute=entry.facts.find(f=>f.label==='当前争议')?.text;
  waiting.push(dispute??(entry.status==='dormant'?'当前尚无新的公开动向。':'等待新的消息或实际军政变化。'));
  if(deadline)waiting.push('到达处理窗口后按实际局势复议。');
 }
 if(!war&&outstanding.length)waiting.push('仍有与本人有关的战后待遇待兑现。');
 const scene:DialogScene=war?(besieged?'fortress':'military'):event?.phase==='dispute'?'care':'dispatch';
 const arrangement=war?.civil?.arrangement;
 const goal=arrangement?powerGoalNames[arrangement.goal]:'争夺朝廷控制权';
 const politicalTarget=arrangement?arrangement.goal==='executive'?'保留君主 '+politicalName(arrangement.beneficiary,w)+'；拟由 '+politicalName(arrangement.executive,w)+' 执政':arrangement.goal==='ruler'?'拟拥立 '+politicalName(arrangement.beneficiary,w):'拟拥立 '+politicalName(arrangement.beneficiary,w)+'，变更国统':undefined;
 return {entry,event,war,document,deadline,waiting,scene,goal,politicalTarget,stanceDue,commitments};
}
export type HouJingPresentation=ReturnType<typeof houJingPresentation>;

export function houJingParty(w:World,war:War,side:'attack'|'defend'){
 const realm=side==='attack'?war.attacker:war.defender;
 const leader=side==='attack'?war.civil!.claimant:war.civil!.loyalist??governmentOf(w,realm)?.executives[0]??governmentOf(w,realm)?.ruler;
 const armies=w.realm!.armies.filter(a=>warArmySide(w,war,a)===side);
 const exact=armies.every(a=>militaryArmyView(w,a).exact);
 return {realm,leader,troops:exact?armies.reduce((n,a)=>n+a.troops,0):null,cities:Object.keys(w.realm!.cities).filter(id=>warCitySide(w,war,id)===side)};
}

export function houJingMembers(w:World,war:War){
 return Object.entries(war.civil?.mobilization?.members??{}).map(([id,member])=>{
  const person=personSheetPresentation(w,id),site=personResidence(w,id).site;
  const armies=w.realm!.armies.filter(a=>a.owner===id||armyCommander(w,a)===id);
  const exact=armies.every(a=>militaryArmyView(w,a).exact);
  return {id,member,person,site,troops:exact?armies.reduce((n,a)=>n+a.troops,0):null,reason:civilAvailability(w,war,id),stance:civilStanceNames[member.choice]};
 });
}
