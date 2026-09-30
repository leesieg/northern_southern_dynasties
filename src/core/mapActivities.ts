import {ongoingItems,type OngoingItem} from './ongoing';
import type {World} from './types';
/** Only public, located activities already visible to the player; schemes stay private. */
export function mapActivities(w:World){
 const groups=new Map<string,OngoingItem[]>();
 for(const item of ongoingItems(w)){
  // Battles and sieges have dedicated map markers and detail dialogs.
  if(item.id.startsWith('siege:'))continue;
  let site:string|undefined;
  if(item.kind==='activity')site=w.mobility?.activities.find(a=>'activity:'+a.id===item.id)?.site;
  else if(item.id.startsWith('trade:'))site=w.commerce?.contracts.find(t=>'trade:'+t.id===item.id)?.location;
  else if(item.id.startsWith('enterprise:'))site=w.enterprises?.items.find(e=>'enterprise:'+e.id===item.id)?.site;
  else if(item.kind==='service')site=item.target.page==='duties'?'tianshui':w.service?.tasks.find(t=>'service:'+t.id===item.id)?.site;
  else if(item.kind==='construction')site=item.target.page==='estate'?w.holdings.estate.location:item.target.page==='city'?item.target.site:undefined;
  if(site){const list=groups.get(site)??[];list.push(item);groups.set(site,list);}
 }
 return [...groups].map(([site,items])=>({site,items}));
}
