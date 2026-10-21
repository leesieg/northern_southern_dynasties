import {it,expect,vi} from 'vitest';
import {renderToStaticMarkup as render} from 'react-dom/server';
import {newCampaignWorld} from '../core/world';
import {LifeDetails,LifeSummary} from './LifeDetails';

it('shows integer ages and birth years without approximation labels, including the deceased ancestor',()=>{
 const world=newCampaignWorld('xiao-yan',undefined,'sandbox'),before=structuredClone(world),send=vi.fn(async()=>true);
 const living=render(<><LifeSummary world={world} id="xiao-yuanming"/><LifeDetails world={world} id="xiao-yuanming" pending={false} send={send}/></>);
 expect(living).toContain('56 岁');expect(living).toContain('490');expect(living).not.toMatch(/约龄|约生于|约 /);
 const elder=render(<><LifeSummary world={world} id="xiao-yi-elder"/><LifeDetails world={world} id="xiao-yi-elder" pending={false} send={send}/></>);
 expect(elder).toContain('50 岁');expect(elder).toContain('已故');expect(elder).toContain('500 年去世');expect(elder).not.toContain('延医照料');expect(elder).not.toContain('health-gauge');
 expect(world).toEqual(before);expect(send).not.toHaveBeenCalled();
});
