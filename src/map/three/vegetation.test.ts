import {it,expect} from 'vitest';
import {vegetationCandidates} from './vegetation';
import {projectGround} from './geography';
import {siteById} from '../../data/scenario';
it('distributes a limited tree budget across all quadrants in each major region',()=>{
 for(const id of ['jiankang','chengdu','guangzhou','wuwei','ye','luoyang']){
  const center=projectGround(siteById[id].lon,siteById[id].lat),all=vegetationCandidates(center.x,center.z,160),budget=all.slice(0,600);
  const quadrants=[0,0,0,0];for(const p of budget)quadrants[Number(p.x>center.x)*2+Number(p.z>center.z)]++;
  for(const count of quadrants)expect(count,id).toBeGreaterThan(90);
  expect(all).toEqual(vegetationCandidates(center.x,center.z,160));
 }
});
