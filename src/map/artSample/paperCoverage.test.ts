import {expect,it} from 'vitest';
import {inwardPaperCoverage} from './paperCoverage';
it('feathers inside coverage without exposing any unmodeled pixel',()=>{
 for(let blur=0;blur<=1;blur+=.01)expect(inwardPaperCoverage(0,blur)).toBe(0);
 for(const raw of [0,.1,.5,1]){let previous=0;for(let blur=0;blur<=1;blur+=.01){const alpha=inwardPaperCoverage(raw,blur);expect(alpha).toBeGreaterThanOrEqual(previous);expect(alpha).toBeLessThanOrEqual(raw);previous=alpha;}}
 expect(inwardPaperCoverage(1,.48)).toBe(0);expect(inwardPaperCoverage(1,1)).toBe(1);
});
