import { describe,it,expect,vi } from 'vitest';
import * as THREE from 'three';
import { emptyCity } from '../core/construction';
import { act,advance,newWorld } from '../core/world';
import { parseWorld,serializeWorld } from '../core/save';
import { cityModelState,createCityModel,disposeCityModel } from './model';
const count=(root:THREE.Object3D)=>{let n=0;root.traverse(o=>{if(o instanceof THREE.Mesh)n++;});return n;};

describe('city model follows authoritative construction state',()=>{
  it('renders a base city with three empty, selectable construction plots',()=>{
    const model=createCityModel(emptyCity(),0);
    expect(count(model)).toBeGreaterThan(100);
    model.updateMatrixWorld(true);
    for(const id of ['market','granary','hostel']){
      const plot=model.getObjectByName(id)!;expect(plot.userData.building).toBe(id);expect(count(plot)).toBe(1);
      const ray=new THREE.Raycaster(new THREE.Vector3(plot.position.x,10,plot.position.z),new THREE.Vector3(0,-1,0));
      expect(ray.intersectObject(plot,true).length).toBeGreaterThan(0);
    }
    disposeCityModel(model);
  });
  it('keeps a construction site until completion and restores the same model state from a save',()=>{
    const w=newWorld();w.holdings.governedCities=['jiankang'];
    act(w,{type:'build',scope:'city',site:'jiankang',building:'market'});advance(w,14);
    const restored=parseWorld(serializeWorld(w)),h=restored.holdings.cities.jiankang;
    expect(cityModelState(h,restored.day)).toEqual(cityModelState(w.holdings.cities.jiankang,w.day));
    expect(cityModelState(h,restored.day)[0]).toMatchObject({level:0,target:1,remaining:1});
    let model=createCityModel(h,restored.day);expect(model.getObjectByName('construction')).toBeDefined();disposeCityModel(model);
    advance(restored);model=createCityModel(h,restored.day);
    expect(model.getObjectByName('construction')).toBeUndefined();expect(count(model.getObjectByName('market')!)).toBeGreaterThan(1);
    expect(cityModelState(emptyCity(),restored.day).every(p=>p.level===0&&p.progress===null)).toBe(true);
    disposeCityModel(model);
  });
  it('adds distinct geometry for every upgrade without changing saved levels',()=>{
    for(const id of ['market','granary','hostel'] as const){
      let previousSize=0;
      for(let level=0;level<=3;level++){
        const h=emptyCity();h.levels[id]=level;const snapshot=structuredClone(h);
        const model=createCityModel(h,0),plot=model.getObjectByName(id)!;
        // Markets / warehouses gain units; the inn gains height and side wings.
        const bounds=new THREE.Box3().setFromObject(plot),size=bounds.getSize(new THREE.Vector3());
        const complexity=count(plot)+size.y;
        expect(complexity).toBeGreaterThan(previousSize);previousSize=complexity;
        expect(Number.isFinite(size.x+size.y+size.z)).toBe(true);expect(h).toEqual(snapshot);disposeCityModel(model);
      }
    }
  });
  it('retains the old building during upgrades and disposes shared materials once',()=>{
    const h=emptyCity();h.levels.hostel=1;h.project={building:'hostel',level:2,started:0,due:28,cost:140};
    const model=createCityModel(h,14),plot=model.getObjectByName('hostel')!;
    expect(plot.getObjectByName('construction')).toBeDefined();expect(plot.children.length).toBeGreaterThan(2);
    const materials=new Set<THREE.Material>();model.traverse(o=>{if(o instanceof THREE.Mesh)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});
    const spies=[...materials].map(m=>vi.spyOn(m,'dispose'));disposeCityModel(model);
    spies.forEach(spy=>expect(spy).toHaveBeenCalledTimes(1));
  });
});
