import {it,expect} from 'vitest';
import {officialSaveCompatible} from './contentBinding';

it('accepts only the exact official pre-health checkpoint, never an altered lock',()=>{
 const prior={packageId:'official-nsd',digest:'7552d2d58e4581fbb45f022305332fc36200c273e614fbfd238ee6e79fdef8ac',engine:'503eab013dd173d6b1913cb31ecd5a0283d68eae4cf664ede971c43d45348afd',assets:'74361bfbf572ba0c4928f662a47e563a9a16cdc96cb19c24c4c7702735e26a58'};
 const current={...prior,digest:'current',engine:'current'};
 expect(officialSaveCompatible(prior,current)).toBe(true);
 expect(officialSaveCompatible({...prior,engine:'unknown'},current)).toBe(false);
 expect(officialSaveCompatible({...prior,assets:'unknown'},current)).toBe(false);
});

it('preserves the exact previous health release while rejecting mismatched dependencies',()=>{
 const prior={"packageId":"official-nsd","digest":"ab81d2e7d0cb16964e4440797d3ad0612758bccc2e68d6ec8cb3a88a4b626872","engine":"fac2284db40b285ae440f35747f2de5ea42d3276007a7ee5652e3ccf7060a702","assets":"74361bfbf572ba0c4928f662a47e563a9a16cdc96cb19c24c4c7702735e26a58"},current={...prior,digest:'current',engine:'current'};
 expect(officialSaveCompatible(prior,current)).toBe(true);
 expect(officialSaveCompatible({...prior,engine:'unknown'},current)).toBe(false);
 expect(officialSaveCompatible({...prior,assets:'unknown'},current)).toBe(false);
});
