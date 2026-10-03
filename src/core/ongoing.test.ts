import {LIFESTYLE_XP_PER_POINT} from '../data/lifestyles';
import {newGovernedCampaignWorld as newCampaignWorld} from './governedTestWorld';
import {routeGrant} from './treasury';
import {describe,it,expect} from 'vitest';
import {act,advance,remainingDays} from './world';
import {ongoingItems} from './ongoing';
import {pauseHasActions,type PauseEvent} from './pauseEvents';
import {actDuty} from './duties';
import {parseWorld,serializeWorld} from './save';
import {governmentOf} from './government';
import {courtOf} from './court';
import {economyCommandReason,economyPresentation} from './personalEconomyAdapter';
import {ensureLifestyle} from './lifestyle';
const start=(id='xiao-yan')=>newCampaignWorld(id,undefined,'sandbox');
const event=(kind:PauseEvent['kind'],extra:Partial<PauseEvent>={}):PauseEvent=>({id:'test',kind,title:'事项',body:'说明',...extra});
describe('顶部进行中事项投影',()=>{
 it('无进行中事项时仅留初选及生活待办，读取不改变世界，普通行程逐日计时并在抵达后移除',()=>{
  const w=start();expect(ongoingItems(w).filter(i=>!['focus','marriage','education','family','care'].includes(i.kind))).toEqual([]);act(w,{type:'travel',destination:'jingkou'});const before=structuredClone(w),flag=ongoingItems(w).find(i=>i.kind==='travel')!;expect(w).toEqual(before);expect(flag.days).toBe(remainingDays(w.people[0]));expect(flag.progress).toBe(0);advance(w);const next=ongoingItems(w).find(i=>i.id===flag.id)!;expect(next.days).toBe(flag.days!-1);expect(next.progress).toBeGreaterThan(0);advance(w,remainingDays(w.people[0]));expect(ongoingItems(w).some(i=>i.kind==='travel')).toBe(false);
 });
 it('出行与亲自赴约合成一面旗，驻留与决定阶段继续使用同一ID',()=>{
  const w=start('xiao-gang');act(w,{type:'mobility',action:'plan',kind:'visit',site:'xunyang',target:'xiao-yi'});let flags=ongoingItems(w);expect(flags.filter(f=>f.kind==='activity')).toHaveLength(1);expect(flags.some(f=>f.kind==='travel')).toBe(false);const id=flags.find(f=>f.kind==='activity')!.id,a=w.mobility!.activities[0];
  while(a.phase==='travel'&&w.day<100){if(w.realm!.event)act(w,{type:'realm',action:'event',choice:'decline'});advance(w);}
  flags=ongoingItems(w);expect(flags.find(f=>f.id===id)?.status).toBe('待开始');expect(flags.find(f=>f.id===id)?.clock).toBe('deadline');act(w,{type:'mobility',action:'begin',id:a.id});expect(ongoingItems(w).find(f=>f.id===id)?.clock).toBe('remaining');act(w,{type:'mobility',action:'cancel',id:a.id});expect(ongoingItems(w).some(f=>f.id===id)).toBe(false);
 });
 it('显示与自己有关的差事、真实工作量和期限，不展示外国差事',()=>{
  const w=start('yuwen-tai');act(w,{type:'service',action:'begin'});act(w,{type:'service',action:'open',kind:'agriculture',site:'tianshui',officer:'yuan-qin'});const t=w.service!.tasks[0],f=ongoingItems(w).find(i=>i.id==='service:'+t.id)!;expect(f.days).toBe(t.deadline-w.day);expect(f.clock).toBe('deadline');expect(f.progress).toBeNull();t.required=100;t.progress=25;expect(ongoingItems(w).find(i=>i.id===f.id)?.progress).toBe(.25);expect(f.target).toEqual({page:'service',id:t.id});
  const copy=structuredClone(t);copy.id=99;copy.realm='liang';copy.officer='xiao-yi';w.service!.tasks.push(copy);expect(ongoingItems(w).some(i=>i.id==='service:99')).toBe(false);t.phase='closed';expect(ongoingItems(w).some(i=>i.id===f.id)).toBe(false);
 });
 it('候旨没有假进度，改革受阻保留工作进度但不承诺完成时间',()=>{
  const w=start('yuwen-tai'),g=governmentOf(w)!;courtOf(w)!.petition={group:'reform',sponsor:'yuan-qin',due:20};
  const petition=ongoingItems(w).find(i=>i.kind==='petition')!;expect(petition.progress).toBeNull();expect(petition.clock).toBe('deadline');expect(petition.days).toBe(20);
  g.task={kind:'government',target:'feudal',started:0,progress:10,required:180,sponsor:'yuwen-tai'};g.support=10;const reform=ongoingItems(w).find(i=>i.kind==='reform')!;expect(reform.progress).toBeCloseTo(10/180);expect(reform.days).toBeNull();expect(reform.status).toContain('支持');g.task=null;expect(ongoingItems(w).some(i=>i.kind==='reform')).toBe(false);
 });
 it('城市和庄园工程都可追踪，存读前后项目及报价进度一致',()=>{
  const w=start('xiao-gang');act(w,{type:'retinue',action:'recruit',person:'guest-liang'});act(w,{type:'retinue',action:'assign',person:'guest-liang',post:'engineer',site:'jiankang'});routeGrant(w,'jiankang',100,'营建预算');act(w,{type:'build',scope:'city',site:'jiankang',building:'market'});act(w,{type:'build',scope:'estate',site:'jiankang',building:'fields'});advance(w,2);const items=ongoingItems(w);expect(items.filter(i=>i.kind==='construction')).toHaveLength(2);expect(items.every(i=>i.progress===null||i.progress>=0&&i.progress<=1)).toBe(true);expect(ongoingItems(parseWorld(serializeWorld(w)))).toEqual(items);
 });
 it('使团抵达仍是同一旗帜，倒计时改为答复期限；结束即消失',()=>{
  const w=start();act(w,{type:'diplomacy',action:'improve',target:'west'});const mission=w.diplomacy!.missions[0],first=ongoingItems(w).find(i=>i.kind==='diplomacy')!;expect(first.days).toBe(mission.due-w.day);mission.status='audience';const next=ongoingItems(w).find(i=>i.id===first.id)!;expect(next.clock).toBe('deadline');expect(next.days).toBe(mission.expires-w.day);w.diplomacy!.missions=[];expect(ongoingItems(w).some(i=>i.id===first.id)).toBe(false);
 });
 it('公库查核事项指向政务监察，结案后从旗帜移除',()=>{
  const w=start(),p=economyPresentation(w),choice=p.audits.flatMap(account=>p.inspectors.map(inspector=>({account:account.id,inspector:inspector.id}))).find(c=>!economyCommandReason(w,{type:'economy',action:'audit',...c}));
  expect(choice).toBeDefined();act(w,{type:'economy',action:'audit',...choice!});
  const q=w.economy!.investigations[0],flag=ongoingItems(w).find(item=>item.id==='economy-case:'+q.id);
  expect(flag?.target).toEqual({page:'audit'});
  q.phase='closed';expect(ongoingItems(w).some(item=>item.id==='economy-case:'+q.id)).toBe(false);
 });
 it('幕僚在途可追踪，不把同行主公重复算作军队旗帜',()=>{
  const w=start('xiao-gang');governmentOf(w)!.executives.push('xiao-gang');w.realm!.mandate=true;w.mobility!.residences['guest-liang']={site:'jingkou',journey:null};act(w,{type:'retinue',action:'recruit',person:'guest-liang'});advance(w);expect(ongoingItems(w).some(i=>i.kind==='retinue')).toBe(true);routeGrant(w,w.people[0].home,120,'军需预算');act(w,{type:'realm',action:'muster'});act(w,{type:'mobility',action:'command',person:'xiao-yan'});act(w,{type:'realm',action:'march',site:'jingkou'});expect(ongoingItems(w).filter(i=>i.kind==='military')).toHaveLength(1);expect(ongoingItems(w).some(i=>i.kind==='travel')).toBe(false);const armyId=ongoingItems(w).find(i=>i.kind==='military')!.id;advance(w);expect(ongoingItems(w).filter(i=>i.kind==='military')).toHaveLength(1);expect(ongoingItems(w).find(i=>i.kind==='military')!.id).toBe(armyId);
 });
});
describe('生活重心待办旗帜',()=>{
 it('未选重心只读生成待办，确认后换为技能点待办，用完即移除',()=>{
  const w=start(),before=structuredClone(w),flag=ongoingItems(w).find(i=>i.kind==='focus');
  expect(flag).toMatchObject({id:'focus:xiao-yan',progress:null,days:null,clock:'waiting',target:{page:'lifestyle'}});expect(w).toEqual(before);expect(ongoingItems(w).filter(i=>i.kind==='focus')).toHaveLength(1);
  act(w,{type:'lifestyle',action:'focus',focus:'architecture'});expect(ongoingItems(w).some(i=>i.kind==='focus')).toBe(false);
  expect(ongoingItems(w).find(i=>i.kind==='skills')).toMatchObject({title:'技能点 · 共 1 点可用',progress:null,days:null,target:{page:'lifestyle',branch:'stewardship'}});
  act(w,{type:'lifestyle',action:'unlock',perk:'surveying'});expect(ongoingItems(w).some(i=>i.kind==='skills'||i.kind==='focus')).toBe(false);
 });
 it('所有路线余点合计，优先当前路线，用完后直达仍有点数的旧路线，存读一致',()=>{
  const w=start();act(w,{type:'lifestyle',action:'focus',focus:'architecture'});ensureLifestyle(w).xp.stewardship=2*LIFESTYLE_XP_PER_POINT;act(w,{type:'lifestyle',action:'unlock',perk:'surveying'});
  w.day+=90;act(w,{type:'lifestyle',action:'focus',focus:'etiquette'});ensureLifestyle(w).xp.diplomacy=LIFESTYLE_XP_PER_POINT;
  const flags=ongoingItems(w),flag=flags.find(i=>i.kind==='skills');expect(flag?.title).toContain('2 点');expect(flag?.status).toContain('管理 1 点');expect(flag?.status).toContain('交游 1 点');expect(flag?.target).toEqual({page:'lifestyle',branch:'diplomacy'});expect(ongoingItems(parseWorld(serializeWorld(w)))).toEqual(flags);
  act(w,{type:'lifestyle',action:'unlock',perk:'courtesy'});expect(ongoingItems(w).find(i=>i.kind==='skills')?.target).toEqual({page:'lifestyle',branch:'stewardship'});
  act(w,{type:'lifestyle',action:'unlock',perk:'crews'});expect(ongoingItems(w).some(i=>i.kind==='skills')).toBe(false);
 });
 it('缺失旧档记录与虚构人物均提示初选，继任不沿用前任余点，结束游戏不提示',()=>{
  const old=start();delete old.lifestyles;const before=structuredClone(old);expect(ongoingItems(old).some(i=>i.id==='focus:xiao-yan')).toBe(true);expect(old).toEqual(before);expect(ongoingItems(parseWorld(serializeWorld(old))).some(i=>i.kind==='focus')).toBe(true);
  const fictional=newCampaignWorld();expect(ongoingItems(fictional).some(i=>i.id==='focus:fictional')).toBe(true);
  const w=start();act(w,{type:'lifestyle',action:'focus',focus:'architecture'});act(w,{type:'heir',target:'xiao-yi'});act(w,{type:'handover'});expect(ongoingItems(w).some(i=>i.id==='focus:xiao-yi')).toBe(true);expect(ongoingItems(w).some(i=>i.kind==='skills'||i.id==='focus:xiao-yan')).toBe(false);
  w.campaign!.status='lost';expect(ongoingItems(w).some(i=>i.kind==='skills'||i.kind==='focus')).toBe(false);
 });
});
describe('暂停弹窗的决策与通知',()=>{
 it('普通抵达、病情和后台暂停仅为通知',()=>{const w=start();for(const kind of ['arrival','health','background','clan','retinue','error'] as const)expect(pauseHasActions(w,event(kind))).toBe(false);});
 it('待决政务需操作，处理后转通知',()=>{const w=start();w.realm!.event={kind:'market',day:0} as never;expect(pauseHasActions(w,event('realm'))).toBe(true);w.realm!.event=null;expect(pauseHasActions(w,event('realm'))).toBe(false);});
 it('事项结束或取消后不残留操作提示，也不会误用其他事项',()=>{const w=start('xiao-gang');act(w,{type:'mobility',action:'plan',kind:'visit',site:'jiankang',target:'xiao-yan'});const a=w.mobility!.activities[0],e=event('mobility',{activityId:a.id});expect(pauseHasActions(w,e)).toBe(true);expect(pauseHasActions(w,event('mobility',{activityId:999}))).toBe(false);act(w,{type:'mobility',action:'cancel',id:a.id});expect(pauseHasActions(w,e)).toBe(false);});
 it('承办人拟案期间主官抵达仅通知，结案后不残留操作提示',()=>{const w=start('yuwen-tai');act(w,{type:'service',action:'begin'});act(w,{type:'service',action:'open',kind:'agriculture',site:'tianshui',officer:'yuan-qin'});const t=w.service!.tasks[0],e=event('arrival',{assignmentId:t.id});expect(pauseHasActions(w,e)).toBe(false);t.phase='closed';expect(pauseHasActions(w,e)).toBe(false);expect(pauseHasActions(w,event('diplomacy'))).toBe(false);});
 it('差事核准后由承办人启办，不再提示主官重复进入详情',()=>{const w=start('yuwen-tai');act(w,{type:'service',action:'begin'});act(w,{type:'service',action:'open',kind:'agriculture',site:'tianshui',officer:'yuan-qin',plan:'balanced'});const t=w.service!.tasks[0],e=event('service',{assignmentId:t.id});expect(t.phase).toBe('approval');expect(pauseHasActions(w,e)).toBe(true);act(w,{type:'service',action:'approve',id:t.id});expect(t.phase).toBe('ready');expect(pauseHasActions(w,e)).toBe(false);w.mobility!.residences['yuan-qin']={site:t.site,journey:null};act(w,{type:'service',action:'start',id:t.id});expect(t.phase).toBe('working');expect(pauseHasActions(w,e)).toBe(false);});
 it('地方粮务核准后等待承办人，不再提示主官重复进入详情',()=>{const w=start('yuwen-tai');act(w,{type:'duty',action:'open'});actDuty(w,{type:'duty',action:'propose',plan:'purchase'},'dugu-xin');const e=event('duties');expect(pauseHasActions(w,e)).toBe(true);act(w,{type:'duty',action:'approve'});expect(w.duties!.task!.phase).toBe('ready');expect(pauseHasActions(w,e)).toBe(false);});
});
