import {randomUUID} from 'node:crypto';
import {openPackagePreview} from './contentPackageCompiler.mjs';
/** Bounded replay through the production command/receipt host. No fixture state
 * writes, direct action calls or formal saves are exposed to authoring clients. */
export async function debugStudioEvent({content,environment,test,revision}){
 let snapshot,receipt,host;const commands=[],trace=[],started=Date.now();
 try{
  host=await openPackagePreview(content,environment,v=>{if(v.type==='world')snapshot=v;if(v.type==='receipt')receipt=v;});
  const rules=await host.inspect('/src/core/authoredEvents.ts'),native=await host.inspect('/src/core/eventHandlers.ts');
  async function send(command){receipt=null;await host.dispatch({...command,requestId:randomUUID()});return receipt;}
  for(const command of [{type:'init'},{type:'new',scriptId:test.scenarioId,characterId:test.characterId,mode:'sandbox'}]){const r=await send(command);if(!r?.ok)throw new Error(r?.text??'未返回开局回执');}
  const initialState=structuredClone(snapshot.world),deadline=Date.now()+6000;let choice=0,days=0,status='budget-exhausted',reason='达到测试步数预算';
  for(let step=0;step<=test.stepBudget;step++){
   const w=snapshot.world,diagnostic=rules.eventDiagnostics(w,test.eventId);trace.push({step,day:w.day,diagnostic});
   const instance=diagnostic?.instances.at(-1);
   if(instance&&instance.status!=='active'){status=instance.status===test.expectedStatus&&choice===test.choices.length?'passed':'failed';reason=choice!==test.choices.length?'事件提前结束，仍有未执行的选择':instance.status===test.expectedStatus?'实际终态与预期一致':'实际终态 '+instance.status+'，预期 '+test.expectedStatus;break;}
   if(step===test.stepBudget||Date.now()>deadline){reason=Date.now()>deadline?'达到 6 秒规则执行预算':'达到测试步数预算';break;}
   let command;
   if(instance&&instance.actor===w.characterId&&!instance.wait){const selected=test.choices[choice];if(!selected){status='awaiting-decision';reason='等待人工选择；尚未通过行为验证';break;}if(selected.stage!==instance.stage){status='failed';reason='选择阶段与实际阶段不一致：'+selected.stage+' / '+instance.stage;break;}command={type:'command',key:{session:'event-debug-replay',sequence:choice+1},command:{type:'authoredEvent',instanceId:instance.id,revision:instance.revision,optionId:selected.option}};choice++;}
   else {if(days>=test.dayBudget){reason='达到推进日预算；条件或阶段尚未满足';break;}command={type:'step'};days++;}
   const r=await send(command);commands.push({command,receipt:structuredClone(r)});if(!r?.ok){status='failed';reason=r?.text??'规则请求未返回回执';break;}
  }
  const diagnostic=rules.eventDiagnostics(snapshot.world,test.eventId);
  return {id:randomUUID(),revision,status,reason,structural:'passed',digest:content.digest,test,commands,trace,diagnostic,projection:diagnostic?.instances.at(-1)??null,native:native.registeredEventDiagnostics(snapshot.world).filter(h=>!h.editable),elapsedMs:Date.now()-started,storage:'isolated-memory',content,initialState};
 }finally{await host?.close();}
}
