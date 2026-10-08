import {expect,it} from 'vitest';
import {BufferGeometry,Float32BufferAttribute} from 'three';
import {detailArchitecture} from './architectureDetail';
import type {CampaignCityAppearance} from '../campaignScenery';
const appearance:CampaignCityAppearance={capital:false,county:false,south:false,style:'northern',fort:0,levels:[0,0,0],project:-1,progress:0,besieged:false,color:'#fff'};
function geometry(){const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute([6.3,0,0,6.3,1,0,6.3,1,1,0,0,-2,0,2,-2,1,2,-2],3));g.setAttribute('color',new Float32BufferAttribute(Array(18).fill(.5),3));g.setAttribute('architectureSurface',new Float32BufferAttribute(Array.from({length:6},()=>[.9,2]).flat(),2));return g;}
it('shows real fortification and capital rank while retaining the base and footprint',()=>{
 const base=geometry(),fort=detailArchitecture(base.clone(),{...appearance,fort:3}),county=detailArchitecture(base.clone(),{...appearance,county:true}),capital=detailArchitecture(base.clone(),{...appearance,capital:true});
 expect(fort.getAttribute('position').getY(1)).toBeCloseTo(1.12);
 expect(capital.getAttribute('position').getY(4)).toBeGreaterThan(county.getAttribute('position').getY(4));
 for(const g of [fort,county,capital]){const p=g.getAttribute('position'),source=base.getAttribute('position');expect(p.count).toBe(source.count);for(let i=0;i<p.count;i++){expect(p.getX(i)).toBe(source.getX(i));expect(p.getZ(i)).toBe(source.getZ(i));}expect(p.getY(0)).toBe(0);g.dispose();}base.dispose();
});
it('keeps regional art independent of political colour',()=>{
 const a=detailArchitecture(geometry(),{...appearance,style:'jiangnan'}),b=detailArchitecture(geometry(),{...appearance,style:'jiangnan',color:'#f00'});
 expect(a.getAttribute('color').array).toEqual(b.getAttribute('color').array);a.dispose();b.dispose();
});
