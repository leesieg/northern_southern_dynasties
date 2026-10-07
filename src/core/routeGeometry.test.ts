import {describe,it,expect} from 'vitest';
import {roadCoordinates,sampleRoad,journeyPosition,routeCoordinates,remainingRouteCoordinates,roadHeading} from './routeGeometry';
import {armyMapPosition} from '../map/armyMapPresentation';
import {activeRoute,previewArmyRoute} from '../map/geography';
import {newWorld,position,planRoute,act,advance} from './world';
import {parseWorld,serializeWorld} from './save';
import {siteById} from '../data/scenario';
import type {Army} from './realm';

describe('shared road corridor sampling',()=>{
 it('restores a real in-flight save at the same corridor position with unchanged time and reserved resources',()=>{
  const world=newWorld();act(world,{type:'travel',destination:'xunyang'});advance(world,2);
  const restored=parseWorld(serializeWorld(world));
  expect(restored.people[0].journey).toEqual(world.people[0].journey);expect(position(restored.people[0])).toEqual(position(world.people[0]));
  expect(restored.people[0].coins).toBe(world.people[0].coins);expect(restored.people[0].food).toBe(world.people[0].food);
 });
 it('reverses a corridor and keeps all endpoints and unconfigured legacy roads authoritative',()=>{
  expect(roadCoordinates('jiankang','xunyang')).toEqual([...roadCoordinates('xunyang','jiankang')].reverse());
  expect(roadCoordinates('xiangyang','luoyang')).toEqual([[siteById.xiangyang.lon,siteById.xiangyang.lat],[siteById.luoyang.lon,siteById.luoyang.lat]]);
  for(const fraction of [0,.1,.5,.9,1]){
   const a=sampleRoad('jiankang','xunyang',fraction),b=sampleRoad('xunyang','jiankang',1-fraction);
   expect(a.lon).toBeCloseTo(b.lon);expect(a.lat).toBeCloseTo(b.lat);
  }
 });
 it('uses the same curved location in simulation, markers, route remainder and retarget preview without save mutation',()=>{
  const world=newWorld(),j={route:['jiankang','xunyang','jiangling'],leg:0,elapsed:5,durations:[10,12],started:0},army={realm:'liang',location:'jiankang',troops:600,morale:80,supply:200,siege:0,journey:j} as Army;
  world.people[0].journey=j;const snapshot=structuredClone(world),at=journeyPosition(j);
  expect(position(world.people[0])).toEqual(at);expect(armyMapPosition(army)).toEqual(at);
  const current=activeRoute(world,[],army).features[0].geometry.coordinates;
  expect(current).toEqual(remainingRouteCoordinates(j));expect(current[0]).toEqual([at.lon,at.lat]);
  const retarget=previewArmyRoute(army,['xunyang','nanchang']).features[0].geometry.coordinates;
  expect(retarget[0]).toEqual(current[0]);expect(retarget.slice(1,4)).toEqual(remainingRouteCoordinates({...j,route:['jiankang','xunyang']}).slice(1,4));
  expect(retarget.at(-1)).toEqual([siteById.nanchang.lon,siteById.nanchang.lat]);expect(world).toEqual(snapshot);expect(Number.isFinite(roadHeading(j))).toBe(true);
 });
 it('clamps endpoints and stitches segments without duplicate joins, retaining the route graph and durations',()=>{
  const first=sampleRoad('jiankang','xunyang',-1),last=sampleRoad('jiankang','xunyang',2);
  expect([first.lon,first.lat]).toEqual(roadCoordinates('jiankang','xunyang')[0]);expect([last.lon,last.lat]).toEqual(roadCoordinates('jiankang','xunyang').at(-1));
  const path=routeCoordinates(['jiankang','xunyang','jiangling']);expect(path.filter(p=>p[0]===siteById.xunyang.lon&&p[1]===siteById.xunyang.lat)).toHaveLength(1);
  expect(planRoute('jiankang','xunyang')?.route).toEqual(['jiankang','xunyang']);
 });
});
