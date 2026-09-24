import { it,expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FacialPortrait } from './FacialPortrait';
import { portraitContext } from '../character/composition';
import { facialGenes } from '../core/genetics';
import { historicalCharacters } from '../data/characters';
it('所有历史人物在同一坐标系生成可用五官，不再裁切头部贴图',()=>{
 const portraits=new Set<string>();
 for(const p of historicalCharacters){const html=renderToStaticMarkup(<FacialPortrait context={portraitContext(p.id)}/>);expect(html).not.toMatch(/NaN|Infinity|<img/);expect(html).toContain('clipPath');expect(html).toContain('viewBox="0 0 400 440"');portraits.add(html);}
 expect(portraits.size).toBe(historicalCharacters.length);
});
it('极限五官与男女文武搭配均生成有限坐标，每幅画的裁切定义互不冲突',()=>{
 for(const value of [0,100])for(const sex of ['male','female'] as const)for(const office of ['civilian','ruler','governor','commander'] as const){
  const context=portraitContext('gao-huan');context.identity.sex=sex;context.office=office;
  for(const key of facialGenes)context.identity.genome.facial![key]=[value,value];
  const html=renderToStaticMarkup(<><FacialPortrait context={context}/><FacialPortrait context={context}/></>);
  expect(html).not.toMatch(/NaN|Infinity/);const ids=[...html.matchAll(/ id="([^"]+)"/g)].map(m=>m[1]);expect(new Set(ids).size).toBe(ids.length);
 }
});
