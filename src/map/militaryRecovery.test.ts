import {it,expect,vi,afterEach} from 'vitest';
import {Group} from 'three';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';
import * as infantry from './RiggedInfantry';
import {militaryModelAssets} from './MilitaryModels';
import {MapResourceError} from './resourceLoader';
afterEach(()=>vi.restoreAllMocks());
it('retries a failed military asset, clears its warning and preserves successful assets',async()=>{
 const asset={scene:new Group(),animations:[]} as unknown as GLTF,load=vi.spyOn(infantry,'loadInfantryAsset').mockRejectedValueOnce(new MapResourceError('network','infantry')).mockResolvedValue(asset),warning=vi.fn(),models=militaryModelAssets(()=>{},warning);
 try{await models.ready;expect(warning).toHaveBeenLastCalledWith('步兵兵模未能载入，保留军旗和军队操作。');models.retry();await models.ready;expect(load).toHaveBeenCalledTimes(2);expect(warning).toHaveBeenLastCalledWith('');models.retry();await models.ready;expect(load).toHaveBeenCalledTimes(2);}finally{models.dispose();}
});
