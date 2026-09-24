import {siteById} from './scenario';
/** Game balance coefficients, not historical census or measured historical yields. */
export function regionalEconomy(site:string){
 const s=siteById[site];
 const terrain={平原:{fertility:1.2,capacity:18000},河谷:{fertility:1.35,capacity:16000},丘陵:{fertility:1,capacity:10000},山地:{fertility:.8,capacity:6000},绿洲:{fertility:.75,capacity:5000}}[s.terrain];
 const commercial=['guangzhou','jiankang','jingkou','jiangling','chengdu'].includes(site);
 return {...terrain,trade:commercial?1.65:s.capital?1.4:s.rank==='county'?.75:1,initialPopulation:s.capital?8000:s.rank==='county'?1500:Math.round(3500*terrain.fertility),name:commercial?'商贸枢纽':s.terrain==='平原'||s.terrain==='河谷'?'农耕腹地':'山地边郡'};
}
