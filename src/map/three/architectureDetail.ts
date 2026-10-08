import type {BufferGeometry} from 'three';
import type {CampaignCityAppearance} from '../campaignScenery';

/** Art variants of the approved Blender city, before its common world-scale transform.
 * These dimensions are symbolic. State and geographic footprints remain authoritative.
 */
export function detailArchitecture(geometry:BufferGeometry,appearance:CampaignCityAppearance){
 const position=geometry.getAttribute('position'),color=geometry.getAttribute('color'),surface=geometry.getAttribute('architectureSurface');
 for(let i=0;i<position.count;i++){
  const x=position.getX(i),y=position.getY(i),z=position.getZ(i);
  const rampart=Math.abs(x)<7.1&&(Math.abs(x)>5.6||Math.abs(z)>4.7&&Math.abs(z)<6.3);
  const palace=Math.abs(x)<3&&z<0&&z> -4.5;
  if(y>0&&rampart)position.setY(i,y*(.88+.08*appearance.fort));
  else if(y>0&&palace)position.setY(i,y*(appearance.capital?1.06:appearance.county?.72:.9));
  const kind=surface?.getY(i)??0;
  if(color&&kind===2){
   const tint=appearance.style==='jiangnan'?[1.04,1.05,1.07]:appearance.style==='oasis'?[1.1,1.01,.87]:appearance.style==='basin'?[.96,1.01,.98]:[1.03,1,.94];
   color.setXYZ(i,color.getX(i)*tint[0],color.getY(i)*tint[1],color.getZ(i)*tint[2]);
  }
 }
 position.needsUpdate=true;if(color)color.needsUpdate=true;
 geometry.computeVertexNormals();geometry.computeBoundingSphere();
 return geometry;
}
