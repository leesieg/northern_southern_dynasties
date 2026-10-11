import {useMemo} from 'react';
import {newCampaignWorld} from '../core/world';
import {ownedEstates} from '../core/estates';
import {governmentOf,politicalName} from '../core/government';
import {playerRealm,realmReason} from '../core/realm';
import {localHolder,localSuperior,localTitle} from '../core/localAdministration';
import {territoryNodes} from '../data/territorialHierarchy';
import {siteById} from '../data/scenario';
import {CountyArtwork} from './TerritoryArtwork';
import {CharacterPortrait} from './CharacterPortrait';
import {DecisionMetrics} from './DecisionPresentation';
/** Read-only opening preview built by the same initializer as a real new game. Never saved. */
export function OpeningBrief({person,script}:{person:string;script:string}){
 const w=useMemo(()=>newCampaignWorld(person,script,'sandbox'),[person,script]);
 const r=playerRealm(w),g=governmentOf(w,r)!,seat=g.ruler===person?'君主':Object.values(territoryNodes).find(n=>localHolder(w,n.id,r)===person)?.id,superior=seat&&seat!=='君主'?localSuperior(w,seat,r)?.holder:undefined,estates=ownedEstates(w),home=w.people[0].location;
 const leader=superior??(g.ruler!==person?g.executives.find(id=>id!==person)??g.ruler:undefined),canMuster=!realmReason(w,{type:'realm',action:'mandate'});
 return <section className="opening-brief"><div className="service-case-identity"><CountyArtwork terrain={siteById[home].terrain}/><div><strong>{siteById[home].name}</strong><small>{seat?seat==='君主'?'君主':localTitle(seat):'尚无地方主官席位'}</small></div></div>{leader&&<div className="army-order-identity"><CharacterPortrait characterId={leader} world={w} compact/><span>{superior?'行政上级':leader===g.ruler?'本国君主':'本国执政'}<br/><strong>{politicalName(leader,w)}</strong></span></div>}<DecisionMetrics items={[{label:'本人治理',value:w.holdings.governedCities.length+' 城',icon:'city'},{label:'本人庄园',value:estates.length+' 处',icon:'estate'}]}/><ul className="opening-directions"><li>{seat?'查看辖地人口与公库，再选当前急需的公务。':'先查职位与任用条件，选择请任或积累履历。'}</li><li>{estates.length?'查看庄户、租额与私人收支，安排家产。':'先核对私财，再决定置业或出行。'}</li><li>{w.realm!.mandate?'已有军务资格；征募前核对兵源、钱粮与权限范围。':canMuster?'可请求军务授权，须确认个人影响力成本。':'先经营交往与个人能力，军务仍受身份限制。'}</li></ul></section>;
}
