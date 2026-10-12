import {expect,it} from 'vitest';
import {newCampaignWorld} from '../core/world';
import {cityPaperSymbols,mapActivityIcon} from './paperCitySymbols';
it('follows live capital, fortification and built facilities without sample resources',()=>{
 const world=newCampaignWorld('xiao-yan',undefined,'sandbox');
 const city=world.realm!.cities.jiankang;city.fortification={level:4,due:null};
 world.holdings.cities.jiankang={levels:{market:2,granary:0,hostel:0},project:null};
 let items=cityPaperSymbols(world,'jiankang');
 expect(items).toContainEqual({kind:'city',label:'城防 4 级',value:4});expect(items.some(i=>i.kind==='capital')).toBe(true);
 expect(items).toContainEqual({kind:'coin',label:'市场 2 级',value:2});expect(items.some(i=>['grain','horse','mine','port'].includes(i.kind))).toBe(false);
 city.controller='east';world.holdings.cities.jiankang.levels.market=0;world.holdings.cities.jiankang.levels.granary=3;
 items=cityPaperSymbols(world,'jiankang');expect(items.some(i=>i.kind==='capital'||i.kind==='coin')).toBe(false);expect(items).toContainEqual({kind:'grain',label:'粮仓 3 级',value:3});
 expect(cityPaperSymbols(world,'missing')).toEqual([]);
});

it('maps public activities to sample symbols without introducing private or illustrative state',()=>{
 expect(mapActivityIcon({id:'trade:1',kind:'activity'})).toBe('trade');
 expect(mapActivityIcon({id:'enterprise:1',kind:'activity'})).toBe('coin');
 expect(mapActivityIcon({id:'unrest:1',kind:'military'})).toBe('army');
 expect(mapActivityIcon({id:'build:1',kind:'construction'})).toBe('city');
 expect(mapActivityIcon({id:'service:1',kind:'service'})).toBe('objective');
});
