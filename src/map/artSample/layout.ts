import {segmentDistance} from '../sample/geography';

export interface Point {x:number;z:number}
export const EXTENT={width:180,depth:148};
export const palettes={
 summer:{ground:'#737649',grass:'#8b9257',forest:'#394c32',field:'#a2a167',rock:'#929083',water:'#315e65',leaf:['#617346','#788154','#485f3d'],fog:'#c4c9be',sun:'#fff0d5'},
 autumn:{ground:'#827744',grass:'#a2995e',forest:'#514e30',field:'#c1ae70',rock:'#a79d85',water:'#355f67',leaf:['#9d773e','#ad8b4c','#59683f'],fog:'#cfc8b8',sun:'#ffe3ba'},
 winter:{ground:'#969d8c',grass:'#b9bdac',forest:'#5c6962',field:'#b3b19b',rock:'#aab0a8',water:'#597980',leaf:['#9da69b','#7e8c80','#536d5f'],fog:'#ccd6d4',sun:'#edf3f3'},
};
export type SampleSeason=keyof typeof palettes;
export type View='near'|'middle'|'far'|'paper';
export const views:Record<View,{eye:[number,number,number];target:[number,number,number];label:string;description:string}>={
 near:{eye:[24,27,37],target:[0,0,0],label:'近景',description:'城垣、林缘与行旅'},
 middle:{eye:[48,68,89],target:[-4,0,-4],label:'中景',description:'江流、田野与聚落'},
 far:{eye:[87,145,148],target:[0,0,-5],label:'远景',description:'山系、河谷与城邑'},
 paper:{eye:[0,215,1],target:[0,0,0],label:'舆图',description:'山川留形，城邑留名'},
};
export const clamp=(v:number,a=0,b=1)=>Math.max(a,Math.min(b,v));
export function smooth(a:number,b:number,v:number){const t=clamp((v-a)/(b-a));return t*t*(3-2*t);}
function hash(x:number,z:number){const h=Math.sin(x*127.1+z*311.7)*43758.5453;return h-Math.floor(h);}
export function noise(x:number,z:number){const a=Math.floor(x),b=Math.floor(z),u=smooth(0,1,x-a),v=smooth(0,1,z-b);return (hash(a,b)*(1-u)+hash(a+1,b)*u)*(1-v)+(hash(a,b+1)*(1-u)+hash(a+1,b+1)*u)*v;}
export function riverDistance(x:number,z:number,lines:Point[][]){let d=Infinity;for(const line of lines)for(let i=1;i<line.length;i++)d=Math.min(d,segmentDistance(x,z,line[i-1],line[i]));return d;}
/** Stable large forest masses with irregular edges; this is artwork, not surveyed woodland. */
export function forestCover(x:number,z:number,height:number){return clamp((noise(x*.045+4,z*.045-7)*.68+noise(x*.12,z*.12)*.32-.40)*3+smooth(2,8,height)*.36);}
export function cityClearance(x:number,z:number,cities:Point[]){return Math.min(...cities.map(c=>Math.hypot((x-c.x)/1.25,z-c.z)));}
export function plantable(x:number,z:number,height:number,river:number,cities:Point[]){return river>1.55&&cityClearance(x,z,cities)>7&&forestCover(x,z,height)>.37;}
/** Continuous display blend; never snaps unit size at a camera preset boundary. */
export function detailWeights(distance:number){return {units:1-smooth(75,130,distance),near:1-smooth(80,155,distance),paper:smooth(175,230,distance)};}
/** A reversible path parameter, with zero speed at both ends and no wrap teleport. */
export function travelPose(seconds:number,offset:number){const phase=offset+seconds*.10;return {u:.5-.48*Math.cos(phase),speed:Math.sin(phase)};}
