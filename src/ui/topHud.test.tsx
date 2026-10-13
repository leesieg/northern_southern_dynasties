import {it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {newCampaignWorld,act} from '../core/world';
import {ongoingItems} from '../core/ongoing';
import {PlayerHud} from './PlayerHud';
import {TimeControl} from './TimeControl';
import {OngoingFlags,ongoingClock} from './OngoingFlags';
const noop=()=>{};
it('顶部身份与个人资源来自当前人物，查阅不改世界',()=>{
 const w=newCampaignWorld('xiao-yan',undefined,'sandbox');w.people[0].coins=317;w.people[0].food=29;
 const before=structuredClone(w),html=renderToStaticMarkup(<PlayerHud world={w} onPerson={noop}/>);
 expect(html).toContain('梁君主');expect(html).toContain('盘缠：317钱');expect(html).toContain('行粮：29日');expect(w).toEqual(before);
});
it('暂停显示可恢复的速度，锁定时间时保留菜单和存档入口',()=>{
 const render=(speed:number,locked=false)=>renderToStaticMarkup(<TimeControl date="546 年 1 月 1 日" day={0} speed={speed} locked={locked} lockReason="待处理事件" onSpeed={noop} onStep={noop} onMenu={noop} onSave={noop}/>);
 expect(render(0)).toContain('aria-pressed="true" aria-label="1 倍速度"');expect(render(3)).toContain('aria-pressed="true" aria-label="3 倍速度"');expect(render(3)).toContain('暂停时间');
 const locked=render(0,true);expect(locked).toContain('待处理事件');expect(locked.match(/disabled=""/g)).toHaveLength(5);expect(locked).toContain('aria-label="游戏菜单"');expect(locked).toContain('aria-label="存档与读档"');
});
it('待办不绘制进度，行旅按真实进度显示且不会因渲染推进',()=>{
 const w=newCampaignWorld('xiao-yan',undefined,'sandbox');
 const render=()=>renderToStaticMarkup(<OngoingFlags world={w} onOpen={noop} onBrowse={noop} onWar={noop}/>);
 expect(render()).not.toContain('role="progressbar"');
 act(w,{type:'travel',destination:'jingkou'});const item=ongoingItems(w).find(i=>i.kind==='travel');expect(item).toBeDefined();
 const before=structuredClone(w),html=render();expect(html).toContain('aria-valuenow="0"');expect(html).toContain(`还需 ${item!.days}日`);expect(w).toEqual(before);
});
it('限期与预计不冒充剩余工期，未知期限不编造进度',()=>{
 const item=ongoingItems(newCampaignWorld('xiao-yan',undefined,'sandbox'))[0];
 expect(ongoingClock({...item,clock:'waiting',days:null})).toBe('待办');expect(ongoingClock({...item,clock:'estimate',days:null})).toBe('暂缓');expect(ongoingClock({...item,clock:'deadline',days:12})).toBe('限期 12日');expect(ongoingClock({...item,clock:'estimate',days:12})).toBe('预计 12日');
});
