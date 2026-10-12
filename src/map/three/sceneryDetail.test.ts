import {expect,it} from 'vitest';
import {cityDetailForPixels,sceneryTier,sceneryBudgets} from './sceneryDetail';
it('retains city detail across small zoom reversals and restores full geometry for close views',()=>{
 expect(cityDetailForPixels(66)).toBe('close');expect(cityDetailForPixels(55,'close')).toBe('close');expect(cityDetailForPixels(44,'close')).toBe('regional');expect(cityDetailForPixels(55,'regional')).toBe('regional');
});
it('keeps landscape tiers stable around thresholds with bounded budgets',()=>{
 expect(sceneryTier(10.3)).toBe('near');expect(sceneryTier(10,'near')).toBe('near');expect(sceneryTier(9.7,'near')).toBe('middle');expect(sceneryTier(6.2,'middle')).toBe('middle');expect(sceneryTier(5.9,'middle')).toBe('far');expect(sceneryBudgets.near.trees).toBeLessThanOrEqual(18000);expect(sceneryBudgets.far.trees).toBe(0);expect(sceneryBudgets.middle.shadows).toBe(true);
});
