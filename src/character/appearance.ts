/** Art direction only: these are not measured likenesses or evidence of historical appearance. */
export interface Appearance {faceWidth:number;faceLength:number;jaw:number;cheek:number;nose:number;eyeSpace:number;brow:number;skin:string;hair:string;beard:'none'|'short'|'long';maturity:number;robe:string;trim:string;headwear:'cap'|'crown'|'helmet';armor:boolean}
const base:Appearance={faceWidth:1,faceLength:1,jaw:.86,cheek:1,nose:1,eyeSpace:1,brow:0,skin:'#ba8b6b',hair:'#211e1a',beard:'short',maturity:.3,robe:'#52685c',trim:'#b49961',headwear:'cap',armor:false};
const profiles:Record<string,Partial<Appearance>>={
 'xiao-yan':{faceWidth:.95,faceLength:1.12,jaw:.8,nose:1.05,hair:'#89837a',beard:'long',maturity:.95,robe:'#774b35',headwear:'crown'},
 'xiao-gang':{faceWidth:.96,faceLength:1.02,jaw:.8,eyeSpace:1.04,beard:'short',maturity:.5,robe:'#79534f'},
 'xiao-yi':{faceWidth:.92,faceLength:1.09,jaw:.84,brow:.1,beard:'long',maturity:.48,robe:'#476b66'},
 'yuan-shanjian':{faceWidth:.92,faceLength:1.02,jaw:.78,beard:'none',maturity:.2,robe:'#62678a',headwear:'crown'},
 'gao-huan':{faceWidth:1.12,faceLength:1.05,jaw:1,cheek:1.07,nose:1.18,brow:.18,beard:'short',maturity:.65,robe:'#6c4444',armor:true},
 'gao-cheng':{faceWidth:1.08,jaw:.98,nose:1.1,brow:.12,beard:'none',maturity:.28,robe:'#514b6d'},
 'gao-yang':{faceWidth:1.04,faceLength:.98,jaw:.95,nose:1.08,eyeSpace:.94,brow:.22,beard:'short',maturity:.22,robe:'#3e4c60'},
 'yuan-baoju':{faceWidth:1.1,faceLength:1.02,jaw:.94,nose:.95,beard:'short',maturity:.5,robe:'#7b6140',headwear:'crown'},
 'yuan-qin':{faceWidth:1.05,faceLength:.98,jaw:.87,nose:.95,beard:'none',maturity:.2,robe:'#7a6d50'},
 'yuwen-tai':{faceWidth:1.12,faceLength:1.06,jaw:1.02,cheek:1.08,nose:1.2,brow:.17,beard:'long',maturity:.58,robe:'#57483c',armor:true},
 'dugu-xin':{faceWidth:.98,faceLength:1.09,jaw:.94,cheek:1.03,nose:1.1,eyeSpace:1.02,brow:.13,beard:'short',maturity:.53,robe:'#446367',headwear:'helmet',armor:true},
};
export const appearanceIds=Object.keys(profiles);
export function appearanceFor(id:string):Appearance {if(!Object.hasOwn(profiles,id))throw new Error('没有此人物的模型配置');return {...base,...profiles[id]};}
export type PortraitPose='calm'|'stern'|'pleased';
export type Wardrobe='default'|'court'|'armor';
