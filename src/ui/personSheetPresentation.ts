import {officeHierarchy,superiorOffice,type OfficeNode} from '../core/offices';
import {allegianceRealm} from '../core/officeEligibility';
import {governmentOf,regimeName} from '../core/government';
import {getCharacter,getPerson,familyPersonOf} from '../core/personRegistry';
import {isDeceased} from '../core/lifeState';
import {nobleTitle,nobleRanks} from '../core/nobility';
import {isAdventurer} from '../core/resignation';
import {personTerrainSite} from './terrainScene';
import {personResidence} from '../core/residence';
import type {World} from '../core/types';
const officeOrder=(o:OfficeNode)=>o.kind==='sovereign'?0:o.kind==='executive'?1:o.kind==='honour'?4:o.kind==='city'?3:2;
/** View-only selection from current offices; opening a sheet never assigns an office. */
export function personSheetPresentation(w:World,id:string){
 const person=getCharacter(w,id)??getPerson(w,id)??familyPersonOf(w,id),deceased=isDeceased(w,id);
 const realm=w.realm?allegianceRealm(w,id):getCharacter(w,id)?.polity??getPerson(w,id)?.realm;
 const nodes=w.realm?officeHierarchy(w):[],offices=nodes.filter(o=>o.holder===id&&o.active).sort((a,b)=>officeOrder(a)-officeOrder(b)||a.id.localeCompare(b.id));
 const office=offices.find(o=>o.kind!=='honour'),superior=office?superiorOffice(nodes,office):undefined;
 const government=realm&&w.realm?governmentOf(w,realm):undefined;
 const title=deceased?'已故':office?.kind==='sovereign'?regimeName(w,realm!)+'君主':office?.kind==='executive'?regimeName(w,realm!)+'执政':office?.name??(isAdventurer(w,id)?'在野行旅':'未任官');
 const noble=nobleTitle(w,id),honour=noble?noble.name+nobleRanks[noble.rank].name:offices.find(o=>o.kind==='honour')?.name;
 const site=personTerrainSite(w,id),residence=site?personResidence(w,id):undefined;
 return {name:person?.name??'未录人物',realm,offices,office,superior,title,honour,rites:noble?.rites??false,deceased,site,traveling:residence?.traveling??false,ruler:!deceased?government?.ruler:undefined};
}
