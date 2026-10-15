import {selectContent} from '../core/contentBinding';
import type {PoliticalDefinition} from '../core/politicalDefinition';
import type {StrategyDefinition} from '../core/strategyDefinition';
import type {Person} from '../core/types';
/** Initial stocks and scenario assumptions, not historical demographic claims.
 * The three-realms-v1 rules profile retains its stable realm/person/site IDs. */
export let campaignSetup={
 seed:546103,
 politics:null as PoliticalDefinition|null,
 strategy:null as StrategyDefinition|null,
 // Authored initial stocks. Empty in official play; never reapplied on load.
 personStarts:{} as Record<string,{coins?:number;food?:number;npcCoins?:number;sex:'male'|'female';office?:string}>,
 treasury:{coins:600,grain:1000},
 people:[
      {id:'player',name:'沈行舟',location:'jiankang',home:'jiankang',coins:180,food:90,journey:null,itinerary:[],itineraryIndex:0},
      {id:'merchant',name:'陆商',location:'changan',home:'changan',coins:0,food:0,journey:null,itinerary:['tianshui','jincheng','wuwei','changan'],itineraryIndex:0},
      {id:'messenger',name:'北地驿使',location:'ye',home:'ye',coins:0,food:0,journey:null,itinerary:['jinyang','pingcheng','jicheng','ye'],itineraryIndex:0},
      {id:'traveler',name:'江左行旅',location:'xunyang',home:'xunyang',coins:0,food:0,journey:null,itinerary:['jiangling','changsha','nanchang','xunyang'],itineraryIndex:0},
    ] as Person[],
 roleResources:{ruler:{coins:520,food:120,market:2,granary:1,hostel:0},military:{coins:420,food:100,market:1,granary:2,hostel:0},other:{coins:260,food:90,market:1,granary:0,hostel:1}},
 armies:[{realm:'east',site:'yingchuan',commander:'hou-jing'},...(['liang','east','west'] as const).map(realm=>({realm,site:realm==='liang'?'jiankang':realm==='east'?'ye':'changan',commander:undefined}))] as {realm:'liang'|'east'|'west';site:string;commander?:string}[],
 troops:600,grain:180,experience:20,institution:60,commanderLoyalty:70,morale:70,
 influence:[{person:'hou-jing',value:80}],
 opinions:[{from:'hou-jing',to:'gao-huan',value:30},{from:'hou-jing',to:'gao-cheng',value:-30}],
};
({campaignSetup}=selectContent('campaignSetup',{campaignSetup}));
