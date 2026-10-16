/** Supported personality traits and base abilities; derived bonuses remain separate. */
export const traitDefinitions={
 greedy:{name:'贪婪',effect:'更重视积财；NPC 可能侵吞经管公款，捐输压力 +5；'},
 honest:{name:'正直',effect:' NPC 不主动侵吞；本人选择侵吞时压力 +18；'},
 ambitious:{name:'野心',effect:'更重视储备和长期学习；有余钱时安排研习；'},
 diligent:{name:'勤勉',effect:'新工程工期 -20%；每次动工压力 +6'},
 frugal:{name:'节俭',effect:'新工程造价 -10%；赠礼压力 +8'},
 generous:{name:'慷慨',effect:'赠礼额外 +10 好感、压力 -5；请援压力 +8'},
 gregarious:{name:'善交',effect:'他人对你好感 +8；外交能力 +4'},
 wary:{name:'多疑',effect:'对他人好感 -6；自身交好需 18 日'},
 steadfast:{name:'坚毅',effect:'每 30 日额外减少 8 压力'},
} as const;
export const abilityNames={diplomacy:'外交',martial:'军事',stewardship:'管理',intrigue:'谋略'} as const;
export type Trait=keyof typeof traitDefinitions;
export interface PersonSetup {abilities:Record<keyof typeof abilityNames,number>|null;traits:Trait[]|null;source:string}
export type PersonSetups=Record<string,PersonSetup>;
export function assertPersonSetups(value:unknown):asserts value is PersonSetups|null {
 if(value===null)return;if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length>10000)throw new Error('人物能力初态无效');
 for(const [id,p] of Object.entries(value as PersonSetups)){
  if(!id||id.length>100||id.includes('\0')||['constructor','prototype','__proto__'].includes(id)||!p||Object.keys(p).sort().join(',')!=='abilities,source,traits'||typeof p.source!=='string'||!p.source.trim()||p.source.length>2000)throw new Error('人物能力须注明来源：'+id);
  if(p.abilities!==null&&(Object.keys(p.abilities??{}).sort().join(',')!==Object.keys(abilityNames).sort().join(',')||Object.values(p.abilities).some(n=>!Number.isSafeInteger(n)||n<0||n>30)))throw new Error('基础能力须为 0—30，派生加成另算：'+id);
  if(p.traits!==null&&(!Array.isArray(p.traits)||p.traits.some(t=>!Object.hasOwn(traitDefinitions,t))||new Set(p.traits).size!==p.traits.length||[['greedy','honest'],['frugal','generous']].some(pair=>pair.every(t=>p.traits!.includes(t as Trait)))))throw new Error('特质未知、重复或冲突：'+id);
 }
}
