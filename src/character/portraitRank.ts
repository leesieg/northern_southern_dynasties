import {lifeOf} from '../core/lifeState';
import {characterById} from '../data/characters';
import {officeHierarchy} from '../core/offices';
import type {World} from '../core/types';

export type PortraitRank='sovereign'|'official'|'commander'|'noble'|'adventurer';
export const portraitRankNames:Record<PortraitRank,string>={sovereign:'君主',official:'官员',commander:'将领',noble:'宗室与贵族',adventurer:'在野与行旅'};
export function portraitRank(id:string,world?:World):PortraitRank{
 const character=characterById[id];
 if(world?.realm?.governments&&!lifeOf(world,id)?.death){
  const offices=officeHierarchy(world).filter(o=>o.active&&o.holder===id);
  if(offices.some(o=>o.kind==='sovereign'))return 'sovereign';
  if(offices.some(o=>o.kind==='executive'))return 'official';
  if(offices.some(o=>o.kind==='office'&&(/将军|都督|都护/.test(o.name)||character?.role==='commander')))return 'commander';
  if(offices.some(o=>o.kind==='office'||o.kind==='city'))return 'official';
  if(offices.some(o=>o.kind==='honour'))return 'noble';
  return character?.role==='prince'?'noble':'adventurer';
 }
 if(character?.role==='ruler')return 'sovereign';
 if(character?.role==='regent')return 'official';
 if(character?.role==='commander')return 'commander';
 if(character?.role==='prince')return 'noble';
 return 'adventurer';
}
