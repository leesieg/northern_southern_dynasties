import type {World} from '../core/types';
import {capital,fortificationLevel} from '../core/realm';
import {regionalEconomy} from '../data/regionalEconomy';
import {siteById} from '../data/scenario';
import {militaryArmyView} from '../core/militaryView';
import {paperIcon,type PaperIcon} from './artSample/paperSymbols';
export function cityPaperSymbols(world:World,id:string){
 const city=world.realm?.cities[id];if(!city||!siteById[id])return [];
 const items:{kind:PaperIcon;label:string;value?:number}[]=[];
 if(city.controller!=='frontier'&&capital(city.controller,world)===id)items.push({kind:'capital',label:'都城'});
 items.push({kind:'city',label:'城防 '+fortificationLevel(world,id)+' 级',value:fortificationLevel(world,id)});
 if(world.realm!.armies.some(a=>a.location===id&&!a.journey&&a.troops>0&&militaryArmyView(world,a).exact))items.push({kind:'garrison',label:'有驻军'});
 const levels=world.holdings.cities[id]?.levels;
 if(levels?.granary)items.push({kind:'grain',label:'粮仓 '+levels.granary+' 级',value:levels.granary});
 if(levels?.market)items.push({kind:'coin',label:'市场 '+levels.market+' 级',value:levels.market});
 if(regionalEconomy(id).trade>=1.65)items.push({kind:'trade',label:'商贸枢纽'});
 return items;
}
export function updatePaperCitySymbols(element:HTMLElement,world:World,id:string){
 const symbols=cityPaperSymbols(world,id),key=JSON.stringify(symbols);if(element.dataset.symbols===key)return;element.dataset.symbols=key;element.replaceChildren();
 for(const item of symbols){const node=document.createElement('span');node.className='atlas-paper-symbol icon-'+item.kind;node.tabIndex=0;node.setAttribute('role','img');node.setAttribute('aria-label',item.label);node.dataset.gameHint=item.label;node.innerHTML=paperIcon(item.kind);if(item.value!==undefined){const n=document.createElement('b');n.textContent=String(item.value);node.append(n);}element.append(node);}
}
