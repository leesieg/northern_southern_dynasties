import {expect,it} from 'vitest';
import {atlasOverview,atlasOverviewFov} from './atlasOverview';
import {zoomDistance} from './geography';

it('retains monotonic ground span for every supported overview aspect',()=>{
 for(const aspect of [.73,1.78,3]){let previous=Infinity;const {fov}=atlasOverview(aspect);
  for(let z=1.1;z<=6;z+=.025){const span=zoomDistance(z)*Math.tan(atlasOverviewFov(z,fov)*Math.PI/360);expect(span).toBeLessThanOrEqual(previous);previous=span;}
 }
});
