import {beforeEach,describe,expect,it,vi} from 'vitest';
const previous={packageId:'official-nsd',digest:'91103302f26eadcebffb7a130caed62f3d033a092a51761c896db24e3be57ed0',engine:'7c1c015f206ad03ed4f6f0423a96c995db30423d938105a08970ded8e17bbf06',assets:'164152f982d7f60a5ff95e9af445f8c0f296b398cdaa00df71707dd3392a2c0d'};
describe('verified official checkpoint compatibility',()=>{
 beforeEach(()=>vi.resetModules());
 it('accepts only the exact verified previous lock in the current official binding',async()=>{const b=await import('./contentBinding');b.bindContent({...previous,digest:'current',engine:'current'}, {},true);expect(()=>b.assertSaveContent(previous)).not.toThrow();for(const field of ['packageId','digest','engine','assets'] as const)expect(()=>b.assertSaveContent({...previous,[field]:'unknown'})).toThrow();expect(()=>b.assertSaveContent({...previous,extra:true})).toThrow();});
 it('keeps custom packages exact and refuses official or unlocked saves',async()=>{const b=await import('./contentBinding'),lock={...previous,packageId:'custom',digest:'custom'};b.bindContent(lock,{},false);expect(()=>b.assertSaveContent(previous)).toThrow();expect(()=>b.assertSaveContent(undefined)).toThrow();expect(()=>b.assertSaveContent(lock)).not.toThrow();});
});
