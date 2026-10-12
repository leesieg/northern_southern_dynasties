import {expect,it} from 'vitest';
import {plantClearance} from './plantClearance';
it('clears wide exposed rock faces across spatial cells and asymmetric river banks',()=>{
 const allowed=plantClearance([{x:8,z:8,width:5},{x:-8,z:-8,width:3}]);
 expect(allowed(7,7)).toBe(false);expect(allowed(10,9)).toBe(false);expect(allowed(-9,-8)).toBe(false);
 expect(allowed(20,20)).toBe(true);expect(allowed(20,20,{edge:1,inner:1})).toBe(false);
 expect(allowed(20,20,{edge:1,inner:0})).toBe(true);expect(allowed(20,20,{edge:-1,inner:0})).toBe(false);
});
