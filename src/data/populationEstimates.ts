import {sites} from './scenario';
import {administration,historySources} from './administration';
export interface PopulationEstimate {people:number;low:number;high:number;basis:'allocated-register'|'regional-estimate';source:string;note:string}
// Resident population of the county seat AND its agricultural hinterland, never city walls alone.
// Unmapped counties are excluded from totals, except Wei Yin where all thirteen are represented.
const anchors:Record<string,number>={jiankang:180000,changan:85000,jinyang:75000,ye:130000,jingkou:45000,guangling:42000,shouchun:26000,hefei:18000,wujun:62000,kuaiji:58000,xunyang:30000,jiangling:70000,xiangyang:38000,changsha:27000,nanchang:32000,guangzhou:30000,chengdu:82000,bajun:26000,hanzhong:31000,tianshui:22000,jincheng:12000,wuwei:16000,zhangye:11000,dunhuang:8000,luoyang:28000,pingcheng:12000,jicheng:33000,qingzhou:38000,pengcheng:35000,ningzhou:9000,gaochang:12000,qiuci:10000,shule:8000,liaodong:16000,wucheng:34000,qiantang:27000,yufu:10000,yubi:8000,puzhou:34000,zhongshan:32000,xindu:35000,dongwucheng:22000};
export const populationEstimates:Record<string,PopulationEstimate>=Object.fromEntries(sites.map(s=>{
 const people=anchors[s.id]??(s.polity==='east'?18000:s.polity==='liang'?14000:10000)*(s.terrain==='山地'?.6:s.terrain==='绿洲'?.5:1);
 return [s.id,{people,low:Math.round(people*.6),high:Math.round(people*1.4),basis:'regional-estimate',source:s.polity==='east'?historySources.weiUp.url:s.polity==='liang'?historySources.qi14.url:historySources.weiDown.url,note:'546 年县治及乡里人口推定；结合都邑地位、农耕条件及战乱衰减设值。来源支持区域背景，不是该县同年人口普查。未覆盖全国人口。'}];
}));
// Wei Yin: Wei shu 106A explicitly records 438,024 persons in thirteen counties.
// Total is recorded; per-county weights and uncertainty are ours, not historical census values.
const weiYin=sites.filter(s=>administration[s.id]?.group==='weiyin');
const weight=(id:string)=>id==='ye'?6:id==='linzhang'?2:1;
const totalWeight=weiYin.reduce((n,s)=>n+weight(s.id),0);let assigned=0;
weiYin.forEach((s,i)=>{const people=i===weiYin.length-1?438024-assigned:Math.floor(438024*weight(s.id)/totalWeight);assigned+=people;populationEstimates[s.id]={people,low:Math.round(people*.7),high:Math.round(people*1.3),basis:'allocated-register',source:historySources.weiUp.url,note:'《魏书》武定时期魏尹十三县共 438,024 口；按邺 6、临漳 2、其余县 1 的权重分配。郡总量有记载，县值为推算；非 546 年逐县普查。'};});
export const populationBasisLabel=(id:string)=>populationEstimates[id].basis==='allocated-register'?'郡级户口分配估算':'区域人口推定';
