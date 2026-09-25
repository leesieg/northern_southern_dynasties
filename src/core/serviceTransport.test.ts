import {describe,it,expect} from 'vitest';
import {newCampaignWorld} from './world';
import {actService,type Assignment} from './assignments';
import {dispatchServiceGrain,receiveServiceGrain} from './serviceTransport';
import {advancePopulation} from './population';
function setup(local=false){
 const w=newCampaignWorld('xiao-yan',undefined,'sandbox');actService(w,{type:'service',action:'begin'});
 const t:Assignment={id:1,realm:'liang',kind:'supply',site:'xunyang',target:null,officer:'chen-baxian',credential:null,created:0,changed:0,deadline:120,season:0,phase:'working',plan:'balanced',funds:{coins:40,grain:120},funding:[{account:'central:liang',grainSite:local?'xunyang':null,coins:40,grain:120}],progress:0,required:180,started:true,incidentDone:false,aidRequested:false,helper:null,invitation:null,invited:[],contributors:{},result:null,history:[]};
 w.service!.tasks.push(t);w.service!.nextId=2;w.realm!.armies.push({realm:'liang',location:'xunyang',troops:200,morale:80,supply:0,journey:null,siege:0});return {w,t};
}
describe('service grain delivery',()=>{
 it('dispatches reserved grain once, without taking another debit or instantly provisioning a distant army',()=>{const {w,t}=setup(),coins=w.realm!.treasuries.liang.coins,grain=w.realm!.treasuries.liang.grain;dispatchServiceGrain(w,t);dispatchServiceGrain(w,t);expect(w.realm!.population!.transfers).toHaveLength(1);expect(w.realm!.armies[0].supply).toBe(0);expect(w.realm!.treasuries.liang).toMatchObject({coins,grain});expect(t.spent!.grain).toBe(120);});
 it('local allocated grain is physically handed over only once',()=>{const {w,t}=setup(true);dispatchServiceGrain(w,t);expect(t.delivery!.delivered).toBe(120);receiveServiceGrain(w,t,120,false);expect(w.realm!.armies[0].supply).toBe(120);expect(w.realm!.population!.transfers).toHaveLength(0);});
 it('shares delivered grain by actual deficit rather than army iteration order',()=>{const {w,t}=setup();w.realm!.armies.push({...w.realm!.armies[0],supply:60});dispatchServiceGrain(w,t);receiveServiceGrain(w,t,90,false);expect(w.realm!.armies.map(a=>a.supply)).toEqual([60,90]);expect(t.delivery).toMatchObject({delivered:90,arrived:90,lost:30});});
 it('records real arrival and losses after road travel, never awards departed armies phantom supply',()=>{const {w,t}=setup();dispatchServiceGrain(w,t);w.realm!.armies[0].location='jiankang';const transfer=w.realm!.population!.transfers[0];for(let i=0;i<60&&transfer.status==='traveling';i++){w.day++;advancePopulation(w);}expect(transfer.status).toBe('arrived');expect(t.delivery!.delivered).toBe(0);expect(t.delivery!.arrived+t.delivery!.lost).toBe(120);expect(w.realm!.armies[0].supply).toBe(0);});
});
