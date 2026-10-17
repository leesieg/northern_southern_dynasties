/** Scenario interpretations, not medical estimates or inherited traits. No death dates. */
export const healthProfiles={
 'xiao-yan':{name:'崇佛',description:'崇信佛教形成的清简饮食等生活习惯带来健康增益。衰老风险降低 50%，患病风险降低 20%。',source:'《梁书》卷三；健康增益及系数为游戏演绎。',aging:.5,illness:.8,recovery:1,worsening:1},
 'gao-huan':{name:'军务积劳',description:'长期军政负担使病势容易迁延。患病风险为通常的 4 倍，基础康复机会为通常的 75%，未康复时恶化风险为通常的 2 倍；休养期间暂停此修正。',source:'《梁书》卷五十六、《北齐书》卷二；健康倾向及系数为游戏演绎。',aging:1,illness:4,recovery:.75,worsening:2},
} as const;
export function healthProfileFor(id:string){return Object.hasOwn(healthProfiles,id)?healthProfiles[id as keyof typeof healthProfiles]:undefined;}
