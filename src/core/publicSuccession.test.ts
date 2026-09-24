import {describe,it,expect} from 'vitest';
import {newCampaignWorld,act} from './world';
import {die} from './life';
import {publicSuccessor} from './publicSuccession';
import {governmentReason} from './government';
import {parseWorld,serializeWorld,validateWorld} from './save';
const command=(office:'ruler'|'executive',candidate:string|null,name?:string)=>({type:'government',action:'nominate',office,candidate,name} as const);
describe('public succession relationships',()=>{
 it('prefers recorded adult children over collateral kin and shares the preview with death resolution',()=>{
  const w=newCampaignWorld('xiao-yi',undefined,'sandbox');const heir=publicSuccessor(w,'liang','ruler');expect(heir).toBe('xiao-gang');die(w,'xiao-yan','age');expect(w.realm!.governments!.realms.liang.ruler).toBe(heir);expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('designates a public heir without changing the private heir or replacing the incumbent',()=>{
  const w=newCampaignWorld('xiao-yan',undefined,'sandbox'),privateHeir=w.social!.heir;act(w,command('ruler','xiao-yi'));expect(w.social!.heir).toBe(privateHeir);expect(w.realm!.governments!.realms.liang.ruler).toBe('xiao-yan');expect(publicSuccessor(w,'liang','ruler')).toBe('xiao-yi');expect(parseWorld(serializeWorld(w))).toEqual(w);die(w,'xiao-yan','age');expect(w.realm!.governments!.realms.liang.ruler).toBe('xiao-yi');expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('lets a designated executive succeed the primary while retaining the other living executive',()=>{
  const w=newCampaignWorld('gao-huan',undefined,'sandbox');act(w,command('executive','gao-yang'));die(w,'gao-huan','age');expect(w.realm!.governments!.realms.east.executives).toEqual(['gao-yang','gao-cheng']);expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('does not promote the primary executive nominee when only the deputy dies',()=>{
  const w=newCampaignWorld('gao-huan',undefined,'sandbox');act(w,command('executive','gao-yang'));die(w,'gao-cheng','age');expect(w.realm!.governments!.realms.east.executives).toEqual(['gao-huan']);expect(w.realm!.governments!.realms.east.heirs!.executive).toBe('gao-yang');expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('forms a named successor dynasty only on actual succession, preserving borders and save validity',()=>{
  const w=newCampaignWorld('xiao-yan',undefined,'sandbox'),g=w.realm!.governments!.realms.liang;g.support=80;
  const owners=Object.fromEntries(Object.entries(w.realm!.cities).map(([id,c])=>[id,c.owner]));act(w,command('ruler','chen-baxian','陈'));expect(g.dynasty).toBe('liang');expect(parseWorld(serializeWorld(w))).toEqual(w);
  die(w,'xiao-yan','age');expect(g.ruler).toBe('chen-baxian');expect(w.realm!.governments!.regimes.at(-1)?.name).toBe('陈');expect(Object.fromEntries(Object.entries(w.realm!.cities).map(([id,c])=>[id,c.owner]))).toEqual(owners);expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('rejects unauthorized, foreign, underage and dead claimants; expires a deceased nominee',()=>{
  const w=newCampaignWorld('xiao-yi',undefined,'sandbox');expect(governmentReason(w,command('ruler','xiao-gang'))).toContain('仅君主');
  const emperor=newCampaignWorld('xiao-yan',undefined,'sandbox');for(const id of ['gao-yang','xiao-fangzhi'])expect(governmentReason(emperor,command('ruler',id))).toContain('本国在世成年');
  act(emperor,command('ruler','xiao-yi'));die(emperor,'xiao-yi','age');expect(emperor.realm!.governments!.realms.liang.heirs!.ruler).toBeNull();expect(governmentReason(emperor,command('ruler','xiao-yi'))).toContain('本国在世成年');expect(parseWorld(serializeWorld(emperor))).toEqual(emperor);
 });
 it('rejects malformed nominations in imports and restores the fallback on withdrawal',()=>{
  const w=newCampaignWorld('xiao-yan',undefined,'sandbox');act(w,command('ruler','xiao-yi'));act(w,command('ruler',null));expect(publicSuccessor(w,'liang','ruler')).toBe('xiao-gang');expect(parseWorld(serializeWorld(w))).toEqual(w);
  for(const heirs of [{ruler:'gao-yang',executive:null,dynasty:null},{ruler:'xiao-yi',executive:null,dynasty:'陈'},{ruler:null,executive:'xiao-fangzhi',dynasty:null}]){const bad=structuredClone(w);bad.realm!.governments!.realms.liang.heirs=heirs;expect(()=>validateWorld(bad)).toThrow();}
 });
});
