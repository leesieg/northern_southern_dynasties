export interface InitialLife {presence:'active'|'dead'|'unborn'|'excluded';health:number;deathYear:number|null;source:string}
export type ScenarioLife=Record<string,InitialLife>;
export function assertScenarioLife(value:unknown):asserts value is ScenarioLife|null {
 if(value===null)return;
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length>10000)throw new Error('人物生命初态无效');
 for(const [id,p] of Object.entries(value as ScenarioLife))if(!id||!p||Object.keys(p).sort().join(',')!=='deathYear,health,presence,source'||!['active','dead','unborn','excluded'].includes(p.presence)||!Number.isSafeInteger(p.health)||p.health<0||p.health>100||p.presence==='active'&&p.health===0||p.presence!=='active'&&p.health!==0||p.deathYear!==null&&(!Number.isSafeInteger(p.deathYear)||p.presence!=='dead')||typeof p.source!=='string'||!p.source.trim()||p.source.length>2000)throw new Error('人物生命初态字段无效：'+id);
}
export function presenceAtStart(value:ScenarioLife|null,births:Record<string,{year:number}>,year:number,id:string){return value===null?'active':value[id]?.presence??(births[id]?.year>year?'unborn':'active');}
export function validateScenarioLife(value:ScenarioLife|null,births:Record<string,{year:number}>,year:number,required:string[]){
 assertScenarioLife(value);if(value===null)return;
 for(const [id,p] of Object.entries(value)){const birth=births[id]?.year;if(birth===undefined||p.presence==='unborn'&&birth<=year||['active','dead'].includes(p.presence)&&birth>year||p.deathYear!==null&&(p.deathYear<birth||p.deathYear>year))throw new Error('生命初态与出生／剧本年份冲突：'+id);}
 for(const id of required)if(presenceAtStart(value,births,year,id)!=='active')throw new Error('可玩人物、统治者、任职者或统帅须参与本局：'+id);
}
