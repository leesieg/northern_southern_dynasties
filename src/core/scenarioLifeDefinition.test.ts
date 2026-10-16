import {describe,it,expect} from 'vitest';
import {assertScenarioLife,validateScenarioLife,type ScenarioLife} from './scenarioLifeDefinition';
const source='架空技术测试';
const births={a:{year:500},b:{year:550}};
describe('scenario life contract',()=>{
 it('keeps omitted legacy mode and auto-detects unborn people only in explicit mode',()=>{expect(()=>validateScenarioLife(null,births,546,['b'])).not.toThrow();expect(()=>validateScenarioLife({},births,546,['b'])).toThrow();});
 it('accepts sourced death and exclusions without inventing a death date',()=>{expect(()=>validateScenarioLife({a:{presence:'dead',health:0,deathYear:530,source},b:{presence:'excluded',health:0,deathYear:null,source}},births,546,[])).not.toThrow();});
 it.each(['dead','unborn','excluded'] as const)('rejects inactive office holder %s',presence=>{const year=presence==='unborn'?550:500;expect(()=>validateScenarioLife({a:{presence,health:0,deathYear:null,source}},{a:{year}},546,['a'])).toThrow();});
 it.each([499,547])('rejects death outside the recorded lifespan (%s)',deathYear=>{expect(()=>validateScenarioLife({a:{presence:'dead',health:0,deathYear,source}},births,546,[])).toThrow();});
 it('rejects unknown fields, missing sources and invalid health',()=>{for(const p of [{presence:'active',health:0,deathYear:null,source},{presence:'dead',health:50,deathYear:null,source},{presence:'active',health:100,deathYear:null,source:''},{presence:'active',health:100,deathYear:null,source,extra:true}])expect(()=>assertScenarioLife({a:p} as ScenarioLife)).toThrow();});
});
