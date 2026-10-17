/** Scenario interpretations, not medical estimates or inherited traits. No death dates. */
export const healthProfiles={
 'xiao-yan':{name:'崇佛',kind:'生活习惯',icon:'buddhist',description:'崇信佛教形成的清简饮食等生活习惯带来健康增益。衰老月风险降低 90%，患病风险降低 35%；85 岁后衰老保护逐年减弱，95 岁起回归通常风险。',source:'《梁书》卷三；健康增益及系数为游戏演绎。',aging:.1,agingFadeFrom:85,agingFadeYears:10,complication:0,illness:.65,recovery:1,worsening:1,pauseOnRest:false},
 'gao-huan':{name:'军务积劳',kind:'健康修正',icon:'campaign-strain',description:'积劳成疾，基础病伤月风险 4%，与重症及低健康风险取较高项；延医降低 40%，强健再降低 20%，休养期间暂停。患病风险为通常的 4 倍，基础康复机会为通常的 75%，未康复时恶化风险为通常的 2 倍。',source:'《梁书》卷五十六、《北齐书》卷二；健康倾向及系数为游戏演绎。',aging:1,agingFadeFrom:0,agingFadeYears:0,complication:.04,illness:4,recovery:.75,worsening:2,pauseOnRest:true},
} as const;
export function healthProfileFor(id:string){return Object.hasOwn(healthProfiles,id)?healthProfiles[id as keyof typeof healthProfiles]:undefined;}
