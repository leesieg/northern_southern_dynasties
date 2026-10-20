import {beforeEach,describe,it,expect,vi} from 'vitest';
import bundle from 'virtual:official-content-package';
import {setContentContext} from '../host/contentContext';
import {createContentLibrary} from '../persistence/contentLibrary';
import {renderToStaticMarkup} from 'react-dom/server';
import {GameEntry} from './GameEntry';
import {newCampaignWorld,dateLabel} from '../core/world';

describe('courtyard main menu',()=>{
  beforeEach(()=>setContentContext({...bundle,library:createContentLibrary(bundle.content,bundle.environment)}));
  it('uses the latest real save identity without changing the world or issuing commands',()=>{
    const world=newCampaignWorld('xiao-yan',undefined,'sandbox');
    const before=structuredClone(world),send=vi.fn(async()=>true);
    const html=renderToStaticMarkup(<GameEntry world={world} pending={false} notice={null} send={send} notify={()=>{}} slots={[
      {id:'older',day:1,savedAt:1,characterName:'萧衍'},
      {id:'newer',day:31,savedAt:2,characterName:'宇文泰'},
    ]}/>);
    expect(html).toContain('is-home');
    expect(html).toContain('宇文泰');
    expect(html).toContain(dateLabel(31));
    expect(html).not.toContain('萧衍');
    expect(html).toContain('aria-label="读取或导入存档"');
    expect(html).toContain('声音设置');
    expect(html).not.toContain('title="声音设置"');
    expect(world).toEqual(before);expect(send).not.toHaveBeenCalled();
  });
  it('disables continue without a save and retains a visible retry on storage error',()=>{
    const html=renderToStaticMarkup(<GameEntry world={newCampaignWorld('xiao-yan',undefined,'sandbox')} slots={[]} pending={false} notice={{text:'存档暂时无法读取',error:true}} send={async()=>false} notify={()=>{}}/>);
    expect(html).toContain('class="primary" disabled=""');
    expect(html).toContain('重新检查存档');
    expect(html).toContain('role="alert"');
    expect(html).not.toContain('546');
  });
});
