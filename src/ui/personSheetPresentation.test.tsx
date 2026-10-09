import {it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {newCampaignWorld} from '../core/world';
import {setLocalHolder,countyTerritory} from '../core/localAdministration';
import {serializeWorld} from '../core/save';
import {personSheetPresentation} from './personSheetPresentation';
import {MapPersonPanel,type PersonTab} from './MapPersonPanel';
import {RealmBadge} from './RealmBadge';
const noop=()=>{};
const render=(world:ReturnType<typeof newCampaignWorld>,id:string,tab:PersonTab='overview')=>renderToStaticMarkup(<MapPersonPanel world={world} ids={[id]} tab={tab} onTab={noop} onPerson={noop} onSelect={noop} onEconomy={noop} onCourtPerson={noop} onStaff={noop} onEstate={noop} onDiplomacy={noop} onLocate={noop} onCity={noop} pending={false} send={noop}/>);
it('现任身份、统属、外国朝廷从当前世界读取，继位后不沿用旧头衔',()=>{
 const w=newCampaignWorld('gao-huan',undefined,'sandbox');
 expect(personSheetPresentation(w,'gao-huan')).toMatchObject({title:'东魏执政',ruler:'yuan-shanjian',realm:'east'});
 expect(personSheetPresentation(w,'yuwen-tai')).toMatchObject({title:'西魏执政',ruler:'yuan-baoju',realm:'west'});
 w.realm!.governments!.realms.east.ruler='gao-yang';
 expect(personSheetPresentation(w,'gao-yang').title).toBe('东魏君主');
 expect(personSheetPresentation(w,'yuan-shanjian').title).not.toContain('君主');
});
it('官位失效、已故、无驻地记录分别显示，未知人物不借用玩家地点',()=>{
 const w=newCampaignWorld('gao-huan',undefined,'sandbox');
 setLocalHolder(w,countyTerritory('ye'),'east','guest-east');
 expect(personSheetPresentation(w,'guest-east').office?.kind).toBe('city');
 w.realm!.cities.ye.controller='west';
 expect(personSheetPresentation(w,'guest-east').office).toBeUndefined();
 w.life!.people['gao-huan'].death={day:0,cause:'age'};
 expect(personSheetPresentation(w,'gao-huan')).toMatchObject({deceased:true,title:'已故',ruler:undefined});
 expect(personSheetPresentation(w,'unknown-ancestor').site).toBeUndefined();
});
it('地图定位采用当前驻地或在途位置，而不是开局地点或终点',()=>{
 const w=newCampaignWorld('gao-huan',undefined,'sandbox');
 w.people[0].location='wuwei';w.people[0].journey={route:['wuwei','jinyang'],durations:[10],leg:0,elapsed:1,started:0};
 expect(personSheetPresentation(w,'gao-huan')).toMatchObject({site:'wuwei',traveling:true});
 w.mobility!.residences['yuwen-tai']={site:'bajun',journey:null};
 expect(personSheetPresentation(w,'yuwen-tai')).toMatchObject({site:'bajun',traveling:false});
});
it('本人五页签、经济庄园入口与实际能力完整保留，渲染不写存档',()=>{
 const w=newCampaignWorld('gao-huan',undefined,'sandbox'),before=serializeWorld(w);
 for(const tab of ['overview','family','relations','focus','interaction'] as const){const html=render(w,'gao-huan',tab);expect(html).toContain('查看经济');expect(html).toContain('家族庄园');expect(html).toContain('地图定位');expect(html).toContain('外交');expect(html).toContain('个人威望');}
 expect(serializeWorld(w)).toBe(before);
});
it('查看其他人物不展示本人的经济、庄园或重心操作；已故没有互动与地图定位',()=>{
 const w=newCampaignWorld('gao-huan',undefined,'sandbox');
 const npc=render(w,'yuwen-tai');expect(npc).not.toContain('查看经济');expect(npc).not.toContain('家族庄园');expect(npc).not.toContain('>重心<');expect(npc).toContain('人物互动');
 w.life!.people['yuwen-tai'].death={day:0,cause:'age'};
 const deceased=render(w,'yuwen-tai');expect(deceased).not.toContain('人物互动');expect(deceased).not.toContain('地图定位');expect(deceased).toContain('任职档案');
});
it('圆章保留真实国号与可访问名称，普通旗帜入口不受影响',()=>{
 const w=newCampaignWorld('gao-huan',undefined,'sandbox');
 const seal=renderToStaticMarkup(<RealmBadge realm="east" world={w} seal onOpen={noop}/>);
 expect(seal).toContain('东魏 · 国家详情');expect(seal).toContain('realm-badge-seal');
 const flag=renderToStaticMarkup(<RealmBadge realm="east" world={w} onOpen={noop}/>);expect(flag).toContain('realm-flag');expect(flag).not.toContain('realm-badge-seal');
});
