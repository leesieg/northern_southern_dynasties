import {describe,it,expect,vi} from 'vitest';
import {renderToStaticMarkup as render} from 'react-dom/server';
import {WarScoreScale} from './WarScoreScale';
import {WarReportDossier} from './WarReportDossier';
import {WarDetails} from './WarDetails';
import {WarSettlement} from './WarSettlement';
import {EventDecision} from './EventDecision';
import {newCampaignWorld} from '../core/world';

describe('dossiers preserve command boundaries and military visibility',()=>{
 it('centers zero and preserves the signed accessible advantage',()=>{
  for(const value of [-28,0,28]){const html=render(<WarScoreScale value={value}/>);expect(html).toContain(`aria-valuenow="${value}"`);expect(html).toContain(`--war-score-position:${(value+100)/2}%`);expect(html).toContain('负值为守方优势');}
 });
 it('selects the latest report without reordering or opening its source',()=>{
  const onOpen=vi.fn(),reports=[{id:'old',day:1,title:'旧报',status:'已结算',facts:'旧内容',icon:'army' as const,onOpen},{id:'new',day:9,title:'新报',status:'已结算',facts:'新内容',icon:'city' as const,onOpen}];
  const html=render(<WarReportDossier reports={reports}/>);expect(html).toContain('新内容');expect(html).not.toContain('旧内容');expect(reports[0].id).toBe('old');expect(onOpen).not.toHaveBeenCalled();
 });
 it('keeps unknown enemy totals undisclosed and viewing peaceful drafts spends nothing',()=>{
  const world=newCampaignWorld('xiao-yan',undefined,'sandbox'),send=vi.fn(async()=>true),war={id:1,attacker:'liang' as const,defender:'east' as const,target:'luoyang',started:0,score:0};
  world.realm!.wars=[war];world.realm!.armies=[{id:1,realm:'east',location:'luoyang',troops:9876,morale:80,supply:100,siege:0,journey:null}];
  const before=structuredClone(world),overview=render(<WarDetails world={world} war={war} pending={false} send={send}/>),treaty=render(<WarSettlement world={world} war={war} pending={false} send={send}/>);
  expect(overview).toContain('现役兵力未详');expect(overview).not.toContain('9876');expect(overview).not.toContain('9,876');expect(treaty).toContain('当前和约草案');expect(treaty).toContain('审阅和约');expect(treaty).toContain('type="radio"');expect(world).toEqual(before);expect(send).not.toHaveBeenCalled();
 });
 it('a mandatory decision has no dismiss action and requires an explicit choice',()=>{
  const send=vi.fn(async()=>true),html=render(<EventDecision label="处置政务" pending={false} send={send} options={[{id:'decline',title:'暂缓处理',description:'不支出',command:{type:'realm',action:'event',choice:'decline'},reason:''}]}/>);
  expect(html).toContain('请选择处置方案');expect(html).toMatch(/button[^>]*disabled/);expect(html).not.toContain('知道了');expect(html).not.toContain('取消');expect(send).not.toHaveBeenCalled();
 });
});
