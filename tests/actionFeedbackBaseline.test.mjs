import {mkdirSync,writeFileSync} from 'node:fs';
import {it,expect} from 'vitest';
import {newGovernedCampaignWorld} from '../src/core/governedTestWorld.ts';
import {officeCandidates} from '../src/core/officeEligibility.ts';
import {appointmentEvaluation} from '../src/core/appointmentRules.ts';
import {courtMonthPreview,advanceCourts} from '../src/core/court.ts';
import {nextMonthStart} from '../src/core/calendar.ts';
import {parseWorld,serializeWorld} from '../src/core/save.ts';
const start=()=>newGovernedCampaignWorld('xiao-yan',undefined,'sandbox');
 it('records a local performance baseline without a long campaign or latency assertions',()=>{
  const base=start(),measure=(fn)=>{
   const samples=[];for(let i=0;i<12;i++){const w=structuredClone(base),t=performance.now();fn(w);const elapsed=performance.now()-t;if(i>=2)samples.push(elapsed);}
   samples.sort((a,b)=>a-b);return {samples:samples.length,medianMs:(samples[4]+samples[5])/2,p95Ms:samples[9],maxMs:samples[9]};
  };
  const results={appointmentCandidates:measure(w=>officeCandidates(w,'liang').map(p=>appointmentEvaluation(w,'liang',p.id,{ministry:'finance'},'xiao-yan'))),courtPreview:measure(w=>courtMonthPreview(w,'liang')),oneCourtMonth:measure(w=>{w.day=nextMonthStart(w.day,w.scriptId);advanceCourts(w);}),saveRoundtrip:measure(w=>parseWorld(serializeWorld(w)))};
  mkdirSync('.cache/ck3-review',{recursive:true});writeFileSync('.cache/ck3-review/performance.json',JSON.stringify(results,null,2));expect(results.oneCourtMonth.maxMs).toBeGreaterThanOrEqual(0);
 });
