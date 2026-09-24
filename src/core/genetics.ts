/** Stylized game inheritance, not a model of human biology or historical ancestry. */
export const geneLimits={face:3,width:100,pigment:100,vitality:1,acuity:1} as const;
export const facialGenes=['faceLength','jaw','cheek','eyeWidth','eyeTilt','eyeSpacing','brow','noseLength','noseWidth','mouth','ears'] as const;
export type FacialGene=typeof facialGenes[number];
export type FacialAlleles=Record<FacialGene,[number,number]>;
export type Gene=keyof typeof geneLimits;
export interface Genome {version:1;alleles:Record<Gene,[number,number]>;facial?:FacialAlleles}
export const congenitalDefinitions={vitality:'体健',acuity:'敏锐'} as const;
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
export function validGenome(v:unknown):v is Genome {
 if(!object(v)||v.version!==1||!object(v.alleles)||Object.keys(v.alleles).length!==Object.keys(geneLimits).length)return false;
 if(v.facial!==undefined&&(!object(v.facial)||Object.keys(v.facial).length!==facialGenes.length||!facialGenes.every(key=>{const a=(v.facial as Record<string,unknown>)[key];return Array.isArray(a)&&a.length===2&&a.every(n=>Number.isSafeInteger(n)&&n>=0&&n<=100);})))return false;
 return Object.entries(geneLimits).every(([key,max])=>{const pair=v.alleles as Record<string,unknown>,a=pair[key];return Array.isArray(a)&&a.length===2&&a.every(n=>Number.isSafeInteger(n)&&n>=0&&n<=max);});
}
function random(seed:number){
 if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff)throw new Error('遗传随机种子无效');
 let state=seed;return {draw:()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;},state:()=>state};
}
export function founderGenome(id:string):Genome {
 let seed=2166136261;for(const ch of id)seed=Math.imul(seed^ch.charCodeAt(0),16777619)>>>0;
 const rng=random(seed),alleles={} as Genome['alleles'];
 for(const [key,max] of Object.entries(geneLimits))alleles[key as Gene]=[Math.floor(rng.draw()*(max+1)),Math.floor(rng.draw()*(max+1))];
 const facial={} as FacialAlleles;for(const key of facialGenes)facial[key]=[Math.floor(rng.draw()*101),Math.floor(rng.draw()*101)];
 return {version:1,alleles,facial};
}
/** Caller supplies birth RNG state, saves nextSeed with the child in one Worker transaction. */
export function inheritGenome(parentA:Genome,parentB:Genome,seed:number):{genome:Genome;nextSeed:number}{
 if(!validGenome(parentA)||!validGenome(parentB))throw new Error('双亲遗传数据无效');
 const rng=random(seed),alleles={} as Genome['alleles'];
 for(const key of Object.keys(geneLimits) as Gene[])alleles[key]=[parentA.alleles[key][Math.floor(rng.draw()*2)],parentB.alleles[key][Math.floor(rng.draw()*2)]];
 const a=facialAlleles(parentA),b=facialAlleles(parentB),facial={} as FacialAlleles;
 for(const key of facialGenes)facial[key]=[a[key][Math.floor(rng.draw()*2)],b[key][Math.floor(rng.draw()*2)]];
 return {genome:{version:1,alleles,facial},nextSeed:rng.state()};
}
export function facialAlleles(genome:Genome):FacialAlleles {
 if(genome.facial)return genome.facial;
 // Stable upgrade for old saves; no mutation or random reroll during rendering.
 const seed=Object.values(genome.alleles).flat().join(':');return founderGenome(seed).facial!;
}
export function expressGenome(genome:Genome){
 if(!validGenome(genome))throw new Error('人物遗传数据无效');
 const mean=(key:Gene)=>(genome.alleles[key][0]+genome.alleles[key][1])/2;
 const facial=facialAlleles(genome),features=Object.fromEntries(facialGenes.map(key=>[key,(facial[key][0]+facial[key][1])/200])) as Record<FacialGene,number>;
 return {features,face:Math.round(mean('face')),width:0.92+mean('width')*.0016,pigment:mean('pigment'),
  congenital:(Object.keys(congenitalDefinitions) as (keyof typeof congenitalDefinitions)[]).filter(key=>genome.alleles[key].every(n=>n===1))};
}
