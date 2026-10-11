import type {World} from '../core/types';
import type {Army} from '../core/realm';
import {armyFieldStatus} from '../core/realm';
import {delegatedArmyDecision} from '../core/militaryAI';
import {armyCampaign} from '../core/militaryCampaigns';
import {armyCommander} from '../core/mobility';
import {militaryArmyView} from '../core/militaryView';
import {politicalName} from '../core/government';
import {accountName} from '../core/treasury';
import {siteById} from '../data/scenario';
import {ArtIcon} from './ArtIcon';
import './armyIntent.css';

export function ArmyIntent({world:w,army:a}:{world:World;army:Army}){
 if(!militaryArmyView(w,a).exact)return null;
 const campaign=armyCampaign(w,a),q=delegatedArmyDecision(w,a),commander=armyCommander(w,a);
 const target=campaign?.target??q.target,source=campaign?.source??a.payer??'central:'+a.realm;
 return <section className="army-intent" aria-label={'第 '+a.id+' 军行军意图'}>
  <h4><ArtIcon name="army" size={24}/>行军意图<small>{campaign?'战役委任':a.automation==='direct'?'亲自下令':'自主行军'}</small></h4>
  <dl><div><dt>目的</dt><dd>{campaign?(campaign.goal==='capture'?'攻取':'守卫'):q.intent}{target?' · '+siteById[target]?.name:''}</dd></div>
   <div><dt>当前</dt><dd>{a.journey?armyFieldStatus(w,a):campaign?(campaign.reason?'推进受阻':armyFieldStatus(w,a)):q.current}</dd></div>
   <div><dt>依据</dt><dd>{campaign?campaign.reason||'按战役目标、专款与损失上限执行':q.reason}</dd></div>
   <div><dt>下一步</dt><dd>{campaign?'按现有战役授权每日复核；可在战役页追加或撤回委任':q.next}</dd></div>
  </dl>
  <footer><span>统帅 · {commander?politicalName(commander,w):'空缺'}</span>{campaign&&<span>授令 · {politicalName(campaign.issuer,w)}</span>}<span>{campaign?'专款来源':'供饷'} · {accountName(source)}</span>{campaign&&<span>专款结余 {campaign.remaining} 钱</span>}</footer>
 </section>;
}
