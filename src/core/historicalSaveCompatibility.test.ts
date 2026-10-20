import {it,expect} from 'vitest';
import {officialSaveCompatible} from './contentBinding';

it('restores the inspected day-1819 official save without accepting altered or custom locks',()=>{
 const prior={packageId:'official-nsd',digest:'e7c5d7fe801fa1c1228b11fc85c427e0d044e522bfa5b21a7102b0e21d463a3b',engine:'4131f533a2275188434a8dbf04c8821ca962cd2ecc5751822b0cd5576993b459',assets:'0ff28f6346c87e80bd0fd56604c6d8be03b833f8ee3837b3e87e010e2979152e'};
 const current={...prior,digest:'current',engine:'current'};
 expect(officialSaveCompatible(prior,current)).toBe(true);
 for(const field of ['digest','engine','assets','packageId'] as const)expect(officialSaveCompatible({...prior,[field]:'unknown'},current)).toBe(false);
 expect(officialSaveCompatible({...prior,extra:true},current)).toBe(false);
 expect(officialSaveCompatible(prior,{...current,packageId:'custom'})).toBe(false);
});

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

it('imports the exact official checkpoint before unarmed handover support without allowing forged locks',()=>{
 const prior={packageId:'official-nsd',digest:'cc15a79032922accfa233eb785150c004f639260644231694d47baeed9796371',engine:'c86f67a546fbaab22629b5fb2ce246a47574e4ff933a0d2976815d4e81312d99',assets:'74361bfbf572ba0c4928f662a47e563a9a16cdc96cb19c24c4c7702735e26a58'},current={...prior,digest:'current',engine:'current'};
 expect(officialSaveCompatible(prior,current)).toBe(true);
 expect(officialSaveCompatible({...prior,digest:'unknown'},current)).toBe(false);
 expect(officialSaveCompatible({...prior,engine:'unknown'},current)).toBe(false);
 expect(officialSaveCompatible({...prior,assets:'unknown'},current)).toBe(false);
});

it('imports the exact official pre-honor-visibility lock without relaxing dependencies',()=>{
 const prior={packageId:'official-nsd',digest:'593eac87e4eeeb4edfd18f1900131005ebaa6f456a1be2b7072507fee61b293d',engine:'0d5be3208e4178dcd1634e7b14f07dc6cf27fc7356c0a6646ccb299b3dcab6bd',assets:'ba42b668580d827e6c1005046908a87041f495dea1cbab9f41fb07b32db17439'},current={...prior,digest:'current',engine:'current'};
 expect(officialSaveCompatible(prior,current)).toBe(true);
 expect(officialSaveCompatible({...prior,engine:'unknown'},current)).toBe(false);
 expect(officialSaveCompatible({...prior,assets:'unknown'},current)).toBe(false);
});
