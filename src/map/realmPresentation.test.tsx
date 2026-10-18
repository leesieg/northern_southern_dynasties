import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createCampaign} from '../core/campaignStart';
import {establishCivilPolity} from '../core/civilPolities';
import {ensureWars,type War} from '../core/wars';
import {regimeName} from '../core/government';
import {polityStyle,realmBanner,realmOrigin} from '../core/polityRuntime';
import {mapRealmName} from './realmPresentation';
import {armyHeraldry} from './ArmyHeraldry';
import {campaignDomains,domainSignature} from './campaignDomains';
import {GovernancePolicyPanel} from '../ui/GovernancePolicyPanel';
import {policyDimensions,policyDefinition} from '../data/governancePolicies';
import {governanceRules} from '../core/governanceRules';

function camp(){
 const w=createCampaign('hou-jing','three-realms-546','sandbox');ensureWars(w);
 const a=w.realm!.armies.find(a=>w.mobility!.armyCommanders?.[a.id!]==='hou-jing')!;
 const war:War={id:w.realm!.nextWarId!++,attacker:'east',defender:'east',target:'ye',started:w.day,score:0,civil:{claimant:'hou-jing',loyalist:'gao-huan',supporters:['hou-jing'],base:a.location,cities:[],armies:[a.id!],name:'讨奸'}};
 w.realm!.wars!.push(war);w.realm!.war=w.realm!.wars![0];establishCivilPolity(w,war,true);return {w,war,r:war.attacker};
}
describe('rebel map identity and policy card structure',()=>{
 it('uses only the actual leader name on the map and a distinct banner and control color',()=>{
  const {w,r}=camp(),before=structuredClone(w);
  expect(mapRealmName(w,r)).toBe('侯景');expect(regimeName(w,r)).toBe('侯景军府');expect(realmOrigin(w,r)).toBe('east');expect(realmBanner(w,r)).toBe('rebel');
  for(const realm of ['liang','east','west','frontier'] as const)expect(polityStyle(w,r).color).not.toBe(polityStyle(w,realm).color);
  const svg=decodeURIComponent(armyHeraldry(r,mapRealmName(w,r),w));expect(svg).toContain('侯');expect(svg).toContain('景');expect(svg).not.toContain('军');expect(svg).toContain('#803f32');
  expect(campaignDomains(w).realms.features.find(f=>f.properties!.id===r)?.properties!.color).toBe(polityStyle(w,r).color);expect(w).toEqual(before);
 });
 it('invalidates the banner and territory cache when the same government becomes a recognized polity',()=>{
  const {w,r}=camp(),signature=domainSignature(w),domains=campaignDomains(w),banner=armyHeraldry(r,'侯景',w);
  delete w.realm!.identities![r]!.civilWar;
  const g=w.realm!.governments!.realms[r];w.realm!.governments!.regimes.find(v=>v.id===g.regimeId)!.name='汉';
  expect(mapRealmName(w,r)).toBe('汉');expect(realmBanner(w,r)).toBe('east');expect(domainSignature(w)).not.toBe(signature);expect(campaignDomains(w)).not.toBe(domains);expect(armyHeraldry(r,'侯景',w)).not.toBe(banner);
 });
 it.each([true,false])('keeps every rule summary separate from optional actions when viewing own realm: %s',own=>{
  const {w,r}=camp();if(!own)w.characterId='xiao-yan';const before=structuredClone(w),rules=governanceRules(w,r);
  const html=renderToStaticMarkup(<GovernancePolicyPanel world={w} realm={r} pending={false} send={async()=>true} onPerson={()=>{}} onTerritory={()=>{}} onService={()=>{}}/>);
  expect(html.match(/class="court-rule-summary"/g)).toHaveLength(policyDimensions.length);
  expect(html.match(/class="court-rule-action"/g)??[]).toHaveLength(own?policyDimensions.length:0);
  for(const d of policyDimensions)expect(html).toContain(policyDefinition(d,rules[d])!.name);
  expect(w).toEqual(before);
 });
});
