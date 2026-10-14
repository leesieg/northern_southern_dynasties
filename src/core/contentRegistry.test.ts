import {describe,it,expect} from 'vitest';
import {createOfficialContent} from '../data/officialContent';
import {characterById} from '../data/characters';
import {sites} from '../data/scenario';
import {canonicalContent,createContentRegistry,type ContentSource} from './contentRegistry';
const source=():ContentSource=>JSON.parse(JSON.stringify(createOfficialContent().snapshot));
describe('official authoring catalogue',()=>{
 it('retains official IDs and sources, without exposing mutable shared objects',()=>{
  const a=createOfficialContent(),b=createOfficialContent();
  expect(a.getCharacter('xiao-yan')).toEqual(characterById['xiao-yan']);
  expect(a.snapshot.sites).toEqual(sites);expect(a.snapshot).not.toBe(b.snapshot);
  expect(a.getCharacter('xiao-yan')).not.toBe(characterById['xiao-yan']);
  expect(Object.isFrozen(a.getCharacter('xiao-yan')!.sources)).toBe(true);
  expect(canonicalContent(a.snapshot)).toBe(canonicalContent(b.snapshot));
  expect(a.getPerson('__proto__')).toBeUndefined();expect(a.getScript('missing')).toBeUndefined();
 });
 it('compiles changed map data into a separate catalogue without affecting official data',()=>{
  const input=source(),original=createOfficialContent();input.sites[0].name='编辑草稿';input.roads[0].days=99;
  const draft=createContentRegistry(input);input.sites[0].name='later';
  expect(draft.map.getSite(input.sites[0].id)?.name).toBe('编辑草稿');
  expect(original.map.getSite(input.sites[0].id)?.name).toBe(sites[0].name);
  expect(canonicalContent(draft.snapshot)).not.toBe(canonicalContent(original.snapshot));
 });
 it('rejects dangling family/place/script references, duplicate IDs and ancestry cycles',()=>{
  const a=source();a.characters[0].family='missing';expect(()=>createContentRegistry(a)).toThrow('家族');
  const b=source();b.people[0].home='missing';expect(()=>createContentRegistry(b)).toThrow('地点');
  const c=source();c.scripts[0].defaultCharacter='missing';expect(()=>createContentRegistry(c)).toThrow('剧本');
  const d=source();d.characters.push(d.characters[0]);expect(()=>createContentRegistry(d)).toThrow('重复');
  const e=source(),link=e.parentLinks[0];e.parentLinks.push({...link,parent:link.child,child:link.parent});expect(()=>createContentRegistry(e)).toThrow('循环');
 });
 it('canonicalizes object key ordering while retaining ordered array semantics',()=>{
  const a=source(),b=Object.fromEntries(Object.entries(a).reverse()) as unknown as ContentSource;
  expect(canonicalContent(a)).toBe(canonicalContent(b));
  b.sites=[...b.sites].reverse();expect(canonicalContent(a)).not.toBe(canonicalContent(b));
 });
});
