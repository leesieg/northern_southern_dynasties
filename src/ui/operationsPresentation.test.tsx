import {describe,it,expect,vi} from 'vitest';
import {renderToStaticMarkup as render} from 'react-dom/server';
import {newCampaignWorld} from '../core/world';
import {serializeWorld} from '../core/save';
import {RealmPanel} from './RealmPanel';
import {DiplomacyPanel} from './DiplomacyPanel';
import {MilitaryHub} from './MilitaryHub';
import {PersonalEconomyPanel} from './PersonalEconomyPanel';
import {IntriguePanel} from './IntriguePanel';
import {StaffChamber} from './StaffChamber';
import {CharacterDirectory} from './CharacterDirectory';
import {OperationsHeader} from './OperationsHeader';
const noop=()=>{};
const send=vi.fn(async()=>true);
const base={pending:false,send,onPerson:noop};
describe('illustrated operations preserve authoritative world state',()=>{
 for(const person of ['xiao-yan','yuwen-tai','dugu-xin'])it(person+' can browse every controlled page without submitting or mutating the save',()=>{
  const world=newCampaignWorld(person,undefined,'sandbox'),before=serializeWorld(world);
  for(const tab of ['overview','duties','council','court'] as const){const html=render(<RealmPanel {...base} world={world} tab={tab} onTab={noop} onCity={noop} onTerritory={noop} onCourt={noop}/>);expect(html).toContain('政务');}
  for(const selected of ['liang','west'] as const)for(const tab of ['overview','relations','history','clans','claims'] as const){const html=render(<DiplomacyPanel {...base} world={world} selected={selected} tab={tab} onTab={noop} onSelect={noop} onCourt={noop}/>);expect(html).toContain('国家详情');expect(html).not.toContain('NaN');}
  for(const tab of ['overview','armies','generals','wars'] as const){const html=render(<MilitaryHub {...base} world={world} tab={tab} onTab={noop} onCity={noop} onArmy={noop} onDiplomacy={noop}/>);expect(html).toContain('军事事务');expect(html).not.toContain('NaN');}
  for(const section of ['overview','ledger','accounts'] as const){const html=render(<PersonalEconomyPanel {...base} world={world} section={section} onSection={noop}/>);expect(html).toContain('家业');expect(html).toContain('收支');expect(html).toContain('往来');}
  for(const tab of ['central','factions','local','situation','government','finance','history'] as const){const html=render(<StaffChamber {...base} world={world} tab={tab} onTab={noop} onTerritory={noop} onService={noop} region="" onRegion={noop} person={person} financeView="treasury" treasuryTab="budget"/>);expect(html).toContain('朝廷事务');expect(html).not.toContain('NaN');}
  expect(render(<IntriguePanel {...base} world={world} onLifestyle={noop} onPolitics={noop} onFulfill={noop}/>)).toContain('筹划');
  expect(serializeWorld(world)).toBe(before);expect(send).not.toHaveBeenCalled();
 });
 it('directory uses the controlled search and keeps the chosen scope explicit',()=>{
  const world=newCampaignWorld('xiao-yan',undefined,'sandbox');
  const html=render(<CharacterDirectory world={world} onPerson={noop} query="宇文泰" scope="all" onQuery={noop} onScope={noop}/>);
  expect(html).toContain('宇文泰');expect(html).not.toContain('萧纲');expect(html).toContain('aria-pressed="true"');
  const own=render(<CharacterDirectory world={world} onPerson={noop} query="宇文泰" scope="realm" onQuery={noop} onScope={noop}/>);expect(own).toContain('未找到人物');
 });
 it('diplomatic header follows current ruler rather than the player identity',()=>{
  const world=newCampaignWorld('xiao-yan',undefined,'sandbox');world.realm!.governments!.realms.west.ruler='yuwen-tai';
  const html=render(<OperationsHeader world={world} realm="west" scene="diplomacy" title="邦交" onClose={noop}/>);expect(html).toContain('宇文泰');expect(html).not.toContain('萧衍');
 });
 it('legacy economy links resolve to the three retained pages',()=>{
  const world=newCampaignWorld('xiao-yan',undefined,'sandbox');
  for(const section of ['household','business','debts'] as const){const html=render(<PersonalEconomyPanel {...base} world={world} section={section} onSection={noop}/>);expect(html).toContain(section==='debts'?'economy-page--ledger':'economy-page--overview');}
 });
});

import {actRealm} from '../core/realm';
import {actService} from '../core/assignments';
import {ServicePanel} from './ServicePanel';
import {OperationsJournal} from './OperationsJournal';
it('active assignment dossier and seasonal council render from actual service commands without spending on view',()=>{
 const world=newCampaignWorld('xiao-yan',undefined,'sandbox');
 actService(world,{type:'service',action:'begin'});
 actService(world,{type:'service',action:'open',site:'jiankang',kind:'relief',officer:'xiao-gang'});
 const before=serializeWorld(world),task=world.service!.tasks[0];
 const html=render(<ServicePanel {...base} world={world} initialTaskId={task.id} mode="duties"/>);
 expect(html).toContain('service-board--split');expect(html).toContain('萧纲');expect(html).toContain('建康');
 const council=render(<ServicePanel {...base} world={world} mode="council"/>);expect(council).toContain('本季');expect(serializeWorld(world)).toBe(before);
});
it('army dossier binds troops and orders to a real mustered army and handles a stale selection',()=>{
 const world=newCampaignWorld('xiao-yan',undefined,'sandbox');actRealm(world,{type:'realm',action:'muster'});
 const army=world.realm!.armies[0],before=serializeWorld(world);
 const html=render(<MilitaryHub {...base} world={world} tab="armies" onTab={noop} selection={{army:-1,general:'',war:null}} onArmy={noop} onCity={noop} onDiplomacy={noop}/>);
 expect(html).toContain(`第 ${army.id} 军`);expect(html).toContain(`${army.troops} 人`);expect(html).toContain('地图军令');expect(html).toContain('粮运');expect(serializeWorld(world)).toBe(before);
});
it('journal has a route to older entries and personal filtering does not misclassify other records',()=>{
 const world=newCampaignWorld('xiao-yan',undefined,'sandbox');
 world.chronicle=Array.from({length:72},(_,i)=>({day:0,text:'国事记录 '+i,person:i===71?'player':'merchant'}));
 const before=serializeWorld(world),all=render(<OperationsJournal world={world} scope="all" onScope={noop} onClose={noop} onPerson={noop}/>),own=render(<OperationsJournal world={world} scope="player" onScope={noop} onClose={noop} onPerson={noop}/>);
 expect(all).toContain('翻阅更早纪事');expect(all).toContain('国事记录 71');expect(own).toContain('国事记录 71');expect(own).not.toContain('国事记录 70');expect(serializeWorld(world)).toBe(before);
});
