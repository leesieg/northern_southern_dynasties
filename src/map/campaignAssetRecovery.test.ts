import {afterEach,it,expect,vi} from 'vitest';
import * as resources from './resourceLoader';
import {prefetchCampaignSampleAssets} from './CampaignSampleAssets';
afterEach(()=>vi.restoreAllMocks());
it('keeps successful model downloads and requests only the failed module on retry',async()=>{
 let failed=true,completed=0;const reader=vi.spyOn(resources,'mapResource').mockImplementation(async path=>{if(path.endsWith('city-v2.glb')&&failed)throw new resources.MapResourceError('network',path);return new Response(new ArrayBuffer(8));});
 await expect(prefetchCampaignSampleAssets(undefined,n=>{completed=n;})).rejects.toMatchObject({kind:'network'});await vi.waitFor(()=>expect(completed).toBe(19));expect(reader).toHaveBeenCalledTimes(20);failed=false;await prefetchCampaignSampleAssets();expect(reader).toHaveBeenCalledTimes(21);await prefetchCampaignSampleAssets();expect(reader).toHaveBeenCalledTimes(21);
});
