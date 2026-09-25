import {appointmentPauses} from '../core/appointmentCycle';
import {pauseSnapshot,pauseEvents,type PauseEvent} from '../core/pauseEvents';
import { act, advance, newWorld, newCampaignWorld } from '../core/world';
import { deleteSave, loadWorld, listSaves, prepareStorage, saveWorld } from '../core/storage';
import { parseWorld, serializeWorld } from '../core/save';
import type { Reply, Request, SaveInfo } from '../core/types';

let world = newWorld();
let speed = 0;
let initialized = false;
let hasCurrentWorld=false;
let slots: SaveInfo[] = [];
let lastSaved: number | null = null;
let busy = false;
const reply = (message: Reply) => self.postMessage(message);
const publish = () => reply({type:'world',world,speed,slots,lastSaved});
const notice = (text: string, error = false) => reply({type:'notice',text,error});
function paused(events:PauseEvent[]){if(events.length){speed=0;reply({type:'paused',events});}}
async function save(auto = false) {
  lastSaved = await saveWorld(world,auto);
  slots = await listSaves();
}
let queue = Promise.resolve();
self.onmessage = (event: MessageEvent<Request>) => {
  queue = queue.then(async () => {
    busy = true;
    const request = event.data;
    const previousPause=pauseSnapshot(world);
    try {
      if (request.type === 'init') {
        try { await prepareStorage();slots = await listSaves(); world = await loadWorld() ?? newWorld(); lastSaved = slots[0]?.savedAt ?? null;hasCurrentWorld=true;initialized=true; }
        catch (error) { notice(error instanceof Error ? error.message : '读取存档失败。',true); }
      } else if (!initialized) return;
      else if(request.type==='new'){
        speed=0;
        const next=newCampaignWorld(request.characterId,request.scriptId,request.mode);
        if(slots.length&&!hasCurrentWorld)throw new Error('最近存档读取失败，请先读取有效备份或导入存档，再开新局。');
        if(slots.length)await saveWorld(world,false,'previous-run');
        lastSaved=await saveWorld(next);world=next;hasCurrentWorld=true;slots=await listSaves();reply({type:'screen',page:'play'});
      }else if(request.type==='resume'){
        const loaded=await loadWorld();if(!loaded)throw new Error('还没有存档，请开始新游戏。');world=loaded;hasCurrentWorld=true;speed=0;reply({type:'screen',page:'play'});
      }else if(request.type==='menu'){speed=0;await save();reply({type:'screen',page:'menu'});}
      else if(request.type==='background'){if(speed)paused([{id:`${world.day}:background`,kind:'background',title:'暂歇片刻',body:'你离开了游戏页面，时间已暂停。回来后可继续安排事务。'}]);}
      else if (request.type === 'speed') speed = [0,1,3,7].includes(request.speed) ? request.speed : 0;
      else if (request.type === 'step') { if(appointmentPauses(world).length)throw new Error('请先审批三年铨选名单。');advance(world);speed=0;await save(true); }
      else if (request.type === 'command') {
        if(request.command.type==='appointments'||request.command.type==='local'||request.command.type==='retinue'||request.command.type==='build'||request.command.type==='mobility'||request.command.type==='service'||request.command.type==='duty'||request.command.type==='health'||request.command.type==='lifestyle'||request.command.type==='government'||request.command.type==='court'||request.command.type==='diplomacy'||request.command.type==='travel'||request.command.type==='realm'||request.command.type==='relationship'||request.command.type==='interact'||request.command.type==='handover'){
          const next=structuredClone(world);act(next,request.command);
          const savedAt=await saveWorld(next,true);world=next;lastSaved=savedAt;slots=await listSaves();if(request.command.type==='travel'||request.command.type==='mobility'&&request.command.action==='plan'&&world.people[0].journey)speed=1;
        }else{act(world,request.command);await save(true);}
      }
      else if (request.type === 'save') { await save(); notice('当前行程已保存。'); }
      else if(request.type==='delete-save'){speed=0;await deleteSave(request.slot);slots=await listSaves();lastSaved=slots[0]?.savedAt??null;notice('存档已删除；当前游玩进度未改变，后续保存将生成新存档。');}
      else if (request.type === 'load') {
        const loaded = await loadWorld(request.slot);
        if (!loaded) throw new Error('没有找到这个存档。');
        if(hasCurrentWorld)await save(true);
        lastSaved=await saveWorld(loaded);world = loaded;hasCurrentWorld=true;speed = 0;slots=await listSaves(); notice('已恢复存档，原进度保留在自动存档中。');reply({type:'screen',page:'play'});
      } else if (request.type === 'export') reply({type:'export',text:serializeWorld(world)});
      else if (request.type === 'import') {
        const imported = parseWorld(request.text);
        if(hasCurrentWorld)await save(true);
        lastSaved=await saveWorld(imported);world = imported;hasCurrentWorld=true;speed = 0;slots=await listSaves(); notice('导入成功，原进度保留在自动存档中。');reply({type:'screen',page:'play'});
      }
    } catch (error) { notice(error instanceof Error ? error.message : '操作失败。',true); }
    finally { if(['init','load','import','resume'].includes(request.type))paused(appointmentPauses(world));if(request.type==='speed'&&request.speed>0)paused(appointmentPauses(world));if(request.type==='step'||request.type==='command')paused(pauseEvents(previousPause,world));if(request.type==='speed'&&request.speed>0&&world.realm?.event)paused([{id:`${world.day}:realm`,kind:'realm',title:'政务待决',body:'请先处理呈报的政务，再继续时间。'}]);if(world.realm?.event||world.campaign&&world.campaign.status!=='active')speed=0;busy = false; publish(); }
  });
};
setInterval(() => {
  if (!initialized || !speed || busy) return;
  busy = true;
  queue = queue.then(async () => {
    try {
      const before = world.day;
      for (let n=0;n<speed;n++) {
        const snapshot=pauseSnapshot(world);
        advance(world);
        const events=pauseEvents(snapshot,world);
        if(events.length){paused(events);await save(true);break;}
        if(world.realm?.event||world.campaign&&world.campaign.status!=='active'){speed=0;break;}
      }
      if (Math.floor(world.day/10) !== Math.floor(before/10)) await save(true);
    } catch (error) { paused([{id:`${world.day}:error`,kind:'error',title:'时间推进已中止',body:error instanceof Error ? error.message : '时间推进失败，请保存或导出当前进度。'}]); }
    finally { busy = false; publish(); }
  });
},1000);
