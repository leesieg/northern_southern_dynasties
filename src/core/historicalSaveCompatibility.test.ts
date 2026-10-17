import {it,expect} from 'vitest';
import {officialSaveCompatible} from './contentBinding';

it('accepts only the exact official pre-health checkpoint, never an altered lock',()=>{
 const prior={packageId:'official-nsd',digest:'7552d2d58e4581fbb45f022305332fc36200c273e614fbfd238ee6e79fdef8ac',engine:'503eab013dd173d6b1913cb31ecd5a0283d68eae4cf664ede971c43d45348afd',assets:'74361bfbf572ba0c4928f662a47e563a9a16cdc96cb19c24c4c7702735e26a58'};
 const current={...prior,digest:'current',engine:'current'};
 expect(officialSaveCompatible(prior,current)).toBe(true);
 expect(officialSaveCompatible({...prior,engine:'unknown'},current)).toBe(false);
 expect(officialSaveCompatible({...prior,assets:'unknown'},current)).toBe(false);
});
