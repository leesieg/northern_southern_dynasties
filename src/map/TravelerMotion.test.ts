import {expect,it} from 'vitest';
import {newCampaignWorld} from '../core/world';
import {sampleRoad} from '../core/routeGeometry';
const point=(a:string,b:string,t:number)=>{const {lon,lat}=sampleRoad(a,b,t);return {lon,lat};};
import {TravelerMotion} from './TravelerMotion';
import {travelerKind} from './TravelerModels';
import type {CultureId} from '../data/cultures';
const start=()=>{const w=newCampaignWorld('xiao-yan',undefined,'sandbox');w.people[0].location='jiankang';w.people[0].journey={route:['jiankang','jingkou','guangling'],durations:[4,4],leg:0,elapsed:1,started:w.day};return w;};
it('buffers only confirmed route progress; starting an order does not anticipate the next day',()=>{
 const w=start(),m=new TravelerMotion();m.sync(w,0,true);expect(m.moving(w.people[0],500)).toBe(false);expect(m.position(w.people[0],500)).toMatchObject(point('jiankang','jingkou',.25));
 const next=structuredClone(w);next.day++;next.people[0].journey!.elapsed=2;m.sync(next,1000,true);
 expect(m.position(next.people[0],1000)).toMatchObject(point('jiankang','jingkou',.25));expect(m.position(next.people[0],1500)).toMatchObject(point('jiankang','jingkou',.375));expect(m.position(next.people[0],2000)).toMatchObject(point('jiankang','jingkou',.5));expect(m.moving(next.people[0],2000)).toBe(false);
 const command=structuredClone(next);command.people[0].coins++;m.sync(command,1500,true);expect(m.position(command.people[0],1500)).toMatchObject(point('jiankang','jingkou',.375));
});
it('handles route legs, pause, canceled travel, loading an earlier world and arrival',()=>{
 const w=start(),m=new TravelerMotion();m.sync(w,0,true);const n=structuredClone(w);n.day+=4;n.people[0].journey!.leg=1;n.people[0].journey!.elapsed=1;m.sync(n,1000,true);expect(m.position(n.people[0],1750)).toMatchObject(point('jingkou','guangling',0));
 m.sync(n,1500,false);expect(m.position(n.people[0],1500)).toMatchObject(point('jingkou','guangling',.25));expect(m.moving(n.people[0],1500)).toBe(false);
 m.sync(w,2000,true);expect(m.moving(w.people[0],2000)).toBe(false);
 const canceled=structuredClone(w);canceled.day++;canceled.people[0].journey=null;m.sync(canceled,2100,true);expect(m.active(canceled.people[0],2100)).toBe(false);
 m.sync(n,3000,true);const arrived=structuredClone(n);arrived.day++;arrived.people[0].location='guangling';arrived.people[0].journey=null;m.sync(arrived,4000,true);expect(m.active(arrived.people[0],4500)).toBe(true);expect(m.active(arrived.people[0],5000)).toBe(false);
});
it('deduplicates the player registry and sees newly created NPC journeys after startup',()=>{
 const w=start(),m=new TravelerMotion();m.sync(w,0,true);expect(m.people.filter(p=>p.id==='player'||p.id===w.characterId)).toHaveLength(1);
 const n=structuredClone(w);n.mobility!.residences['xiao-gang']={site:'jiankang',journey:{...w.people[0].journey!,route:['jiankang','jingkou'],durations:[4],elapsed:0}};m.sync(n,10,true);expect(m.people.find(p=>p.id==='xiao-gang')?.journey).toBeTruthy();
});
it('reuses Xianbei costume for non-Han cultures without rewriting identity, and preserves female and player mapping',()=>{
 const w=start();const before=structuredClone(w);for(const cultureId of ['han','xianbei','gaoche','jie','unknown'] as CultureId[]){w.identities!.people['xiao-yan'].cultureId=cultureId;expect(travelerKind(w,'player')).toBe(`${cultureId==='han'?'han':'xianbei'}-male`);expect(w.identities!.people['xiao-yan'].cultureId).toBe(cultureId);}
 expect(travelerKind(w,'lou-zhaojun')).toBe('xianbei-female');expect(travelerKind(w,'wang-lingbin')).toBe('han-female');expect(travelerKind(w,'yuwen-jue')).toBeUndefined();expect(w.realm).toEqual(before.realm);
});
