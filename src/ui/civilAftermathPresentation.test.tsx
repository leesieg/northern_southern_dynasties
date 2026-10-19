import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {CivilAftermathPanel} from './CivilAftermathPanel';
import {newCampaignWorld,act} from '../core/world';
import {civilWar,settleCivilWar} from '../core/civilWars';
import {allegianceRealm} from '../core/officeEligibility';
import {setLocalHolder,countyTerritory} from '../core/localAdministration';
import {fiscalPath,ensureFiscal} from '../core/treasury';
import {ensureArmyOrganization} from '../core/armyOrganization';
import {governmentOf} from '../core/government';
function fixture(){const w=newCampaignWorld('xiao-yi',undefined,'sandbox'),site=w.people[0].location;w.realm!.armies=[];setLocalHolder(w,countyTerritory(site),'liang','xiao-yi');w.realm!.cities[site].grain=500;ensureFiscal(w)!.balances[fiscalPath(w,site)[0]]=500;w.people[0].coins=500;w.realm!.influence=400;w.realm!.armies.push({realm:'liang',owner:'xiao-yi',location:site,troops:600,morale:100,supply:200,journey:null,siege:0});ensureArmyOrganization(w);act(w,{type:'civilWar',action:'rise',name:'讨奸',arrangement:{goal:'executive',sponsor:'xiao-yi',beneficiary:governmentOf(w,'liang')!.ruler,executive:'xiao-yi',name:''}});settleCivilWar(w,civilWar(w,allegianceRealm(w,'xiao-yi')!)!,'demand','rebel');return w;}
describe('settlement archive rendering and access',()=>{
 it('keeps an actionable archive after the active war disappears without mutating world state',()=>{const w=fixture(),before=JSON.stringify(w),html=renderToStaticMarkup(createElement(CivilAftermathPanel,{world:w,pending:false,send:async()=>true}));expect(w.realm!.wars).toHaveLength(0);expect(html).toContain('战后善后');expect(html).toContain('办理善后');expect(html).toContain('未办事项不暂停日期');expect(JSON.stringify(w)).toBe(before);});
 it('does not show a foreign archive to an unrelated observer',()=>{const source=fixture(),w=newCampaignWorld('guest-west',undefined,'sandbox');w.politics=structuredClone(source.politics);const before=JSON.stringify(w);expect(renderToStaticMarkup(createElement(CivilAftermathPanel,{world:w,pending:false,send:async()=>true}))).toBe('');expect(JSON.stringify(w)).toBe(before);});
 it('describes a grievance result without claiming a takeover of the court',()=>{const w=fixture();w.politics!.civilSettlements![0].purpose='grievance';const html=renderToStaticMarkup(createElement(CivilAftermathPanel,{world:w,pending:false,send:async()=>true}));expect(html).toContain('地方诉求获准');expect(html).not.toContain('起兵方取得朝廷');});
});
