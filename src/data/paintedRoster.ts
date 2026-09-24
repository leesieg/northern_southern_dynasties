import metadata from './paintedAssetMetadata.json';
import type {PaintedRect} from '../character/paintedLayers';

export type PaintedRigId=keyof typeof metadata;
export type FeatureBounds=[number,number,number,number];
/** Observed source-pixel rectangles: left brow, right brow, left eye, right eye, nose, mouth.
 * Facial hair directly touching the lips is authored with the mouth; chin beards stay on the base.
 * All portraits are artistic interpretations, not measured historical likenesses. */
export const paintedBounds:Record<PaintedRigId,FeatureBounds[]>={
 'gao-huan':[[484,210,100,44],[582,238,66,30],[494,244,82,35],[585,259,51,34],[534,272,70,65],[481,330,128,74]],
 'xiao-yan':[[490,216,92,38],[586,239,67,31],[502,251,78,37],[595,267,53,38],[545,281,72,71],[488,347,127,65]],
 female:[[481,231,82,35],[592,260,55,29],[488,266,79,34],[590,285,49,34],[548,297,65,73],[507,369,91,48]],
 'dugu-xin':[[397,182,74,34],[473,201,46,26],[404,209,63,30],[475,220,35,28],[440,231,51,46],[411,273,73,49]],
 'yuwen-tai':[[403,185,78,34],[481,204,44,26],[411,213,62,29],[483,223,34,28],[446,234,56,49],[404,277,97,50]],
 'xiao-gang':[[369,187,76,34],[446,207,45,27],[380,213,60,30],[446,229,36,28],[412,236,54,52],[372,284,84,84]],
 'xiao-yi':[[378,186,78,33],[456,207,47,27],[386,216,63,30],[456,229,37,28],[420,238,55,53],[385,289,83,54]],
 'gao-cheng':[[387,191,76,34],[463,211,46,28],[394,216,64,31],[464,231,36,29],[428,240,52,55],[404,291,67,40]],
 'gao-yang':[[385,182,86,35],[466,204,44,26],[394,211,63,32],[470,223,36,28],[427,231,58,56],[403,285,77,44]],
 'yuan-baoju':[[378,183,78,31],[456,201,43,27],[387,208,65,32],[457,223,35,28],[420,231,60,49],[395,278,81,49]],
 'yuan-qin':[[414,196,82,34],[491,216,46,29],[422,222,65,32],[492,236,37,30],[456,246,54,56],[429,297,73,41]],
 fictional:[[392,181,85,34],[473,203,45,28],[400,209,66,32],[474,224,36,29],[432,233,55,56],[404,291,72,42]],
 child:[[355,212,89,31],[456,228,46,27],[356,240,78,43],[447,251,51,41],[416,279,56,50],[395,329,73,42]],
 'female-north':[[361,161,74,33],[430,181,52,27],[366,187,59,33],[433,204,41,30],[394,215,54,50],[369,260,73,41]],
 'lou-zhaojun':[[368,172,78,32],[442,194,52,29],[375,198,64,36],[444,215,41,31],[408,225,55,53],[386,278,72,44]],
 'wang-lingbin':[[354,164,77,35],[429,182,52,29],[362,190,62,34],[430,207,43,32],[397,217,53,52],[372,269,72,42]],
 'xu-zhaopei':[[351,162,79,35],[428,183,50,28],[360,187,60,35],[428,206,42,32],[390,215,54,55],[368,266,72,43]],
 'chen-baxian':[[386,179,96,38],[475,201,54,30],[399,210,72,34],[476,224,42,31],[433,236,65,55],[399,282,102,57]],
};
export const paintedRosterRigs:Record<string,PaintedRigId>={
 'gao-huan':'gao-huan','xiao-yan':'xiao-yan','dugu-xin':'dugu-xin','yuwen-tai':'yuwen-tai','xiao-gang':'xiao-gang','xiao-yi':'xiao-yi',
 'gao-cheng':'gao-cheng','gao-yang':'gao-yang','yuan-baoju':'yuan-baoju','yuan-qin':'yuan-qin',fictional:'fictional',
 'chen-baxian':'chen-baxian','yuwen-hu':'yuwen-tai','yuan-kuo':'yuan-qin','xiao-fangzhi':'child','yuwen-jue':'child',
 'wang-lingbin':'wang-lingbin','xu-zhaopei':'xu-zhaopei','lou-zhaojun':'lou-zhaojun','guest-liang':'female','guest-east':'female-north','guest-west':'female-north',
};
export const paintedFemaleRigs=new Set<PaintedRigId>(['female','female-north','wang-lingbin','xu-zhaopei','lou-zhaojun']);
export function paintedRig(id:PaintedRigId){
 const asset=metadata[id],width=asset.paired?asset.width/2:asset.width,height=asset.height;
 const boxes=paintedBounds[id],minX=Math.min(...boxes.map(b=>b[0])),maxX=Math.max(...boxes.map(b=>b[0]+b[2]));
 const minY=Math.min(...boxes.map(b=>b[1])),maxY=Math.max(...boxes.map(b=>b[1]+b[3]));
 const side=Math.max(maxX-minX,maxY-minY)*1.7;
 const thumbnail:PaintedRect={x:Math.max(0,(minX+maxX-side)/2)/width,y:Math.max(0,(minY+maxY-side)/2)/height,width:side/width,height:side/height};
 const source=import.meta.env.BASE_URL+asset.source.slice(1);
 return {id,...asset,source,width,height,baseX:asset.paired?width:0,faceSource:asset.paired?source:source.replace('-base.png','-face.png'),thumbnail};
}
