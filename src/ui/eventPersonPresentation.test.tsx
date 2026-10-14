import {describe,it,expect,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {EventPersonLink} from './EventBrowser';
import {newCampaignWorld} from '../core/world';

const {readFileSync}=await vi.importActual<{readFileSync:(path:URL,encoding:'utf8')=>string}>('node:fs');
const css=readFileSync(new URL('./eventBrowser.css',import.meta.url),'utf8');

describe('event person rendering contract (no browser)',()=>{
 it.each([['hou-jing','侯景'],['xiao-yan','萧衍'],['yuwen-tai','宇文泰']])('keeps %s name separate from its actual portrait root', (id,name)=>{
  const w=newCampaignWorld('hou-jing',undefined,'sandbox'),before=structuredClone(w),onPerson=vi.fn();
  const html=renderToStaticMarkup(<EventPersonLink world={w} id={id} onPerson={onPerson}/>);
  expect(html).toContain('aria-label="查看'+name+'"');
  expect(html).toMatch(/<button[^>]*><div class="painted-portrait compact"/);
  expect(html).toContain('<span class="event-person-name">'+name);
  const portraitRule=css.match(/\.event-person>\.painted-portrait\{([^}]+)\}/)?.[1];
  expect(portraitRule).toContain('flex:0 0 60px');expect(portraitRule).toContain('margin:0');
  expect(onPerson).not.toHaveBeenCalled();expect(w).toEqual(before);
 });
 it('omits unavailable people instead of rendering an empty clickable name',()=>{
  const html=renderToStaticMarkup(<EventPersonLink world={newCampaignWorld('hou-jing',undefined,'sandbox')} id="missing-person" onPerson={()=>{}}/>);
  expect(html).toBe('');
 });
});
