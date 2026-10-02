/** Rules and weights are game design informed by the linked texts, not historical statistics. */
export const appointmentPolicies = {
 lineage: {name:'清望与机要', effect:'清显职位重门第与声望；财计、军务仍重对口能力。', source:{title:'《梁书》卷三十八·朱异、贺琛',url:'https://zh.wikisource.org/wiki/梁書/卷38'}},
 selection: {name:'铨选与纠察', effect:'按职掌取人，兼看才干、履历、声望与举荐。', source:{title:'《北齐书》卷三·文襄',url:'https://zh.wikisource.org/wiki/北齊書/卷3'}},
 assessment: {name:'六条任事考课', effect:'重对口能力与实绩，新人可经试任建立履历。', source:{title:'《周书》卷二十三·苏绰',url:'https://zh.wikisource.org/wiki/周書/卷23'}},
} as const;
export const accessPolicies = {
 patronage: {name:'既有荐举',effect:'常额任用沿用资历要求；执政者可破格，但须承担政治代价。'},
 sponsorship: {name:'互荐担保',effect:'对口能力至少 10、举荐与上级信任合计达到 12，可按常额任用。'},
 trial: {name:'任事试用',effect:'对口能力至少 12 且任用评价合格，可先任事；表现由实际能力与成果判断。'},
} as const;
export const registrationPolicies = {
 compact: {name:'地方约定',effect:'保留地方裁量；清税压力较小、追征收入较低。'},
 survey: {name:'分步核籍',effect:'详办核查后提高清税实收；急办未核查只能追征现额，地方承受压力。'},
 equalized: {name:'统一赋役',effect:'核查后按同一口径追征；收入更高，需更多工期，地方秩序与集团协调代价更高。'},
} as const;
export const culturalPolicies={
 customs:{name:'保留军镇旧俗',effect:'保留在任将领的组织待遇，军权交接评价 +6；异文化荐任评价 −4。统一赋役的清税另需 15 工作量，无额外产出。'},
 inclusive:{name:'胡汉并用',effect:'任用不因文化差异扣分；无额外征收或军权收益。撤销旧俗优待时仍需回应已受影响将领的诉求。'},
 integration:{name:'推行汉式整合',effect:'清税详办另需 15 工作量，质量达标时实收 +5%；异文化荐任评价 −4。撤销军镇旧俗优待会提出待遇诉求，未妥协时交接评价 −6。'},
} as const;
export type CulturalPolicy=keyof typeof culturalPolicies;
export const policyDefinitions = {appointment:appointmentPolicies,access:accessPolicies,registration:registrationPolicies,cultural:culturalPolicies};
export type PolicyDimension = keyof typeof policyDefinitions;
export type AppointmentPolicy = keyof typeof appointmentPolicies;
export type AccessPolicy = keyof typeof accessPolicies;
export type RegistrationPolicy = keyof typeof registrationPolicies;
export const policyDimensions:PolicyDimension[]=['appointment','access','registration','cultural'];
export const policyLabels:Record<PolicyDimension,string>={appointment:'任官准则',access:'任职通道',registration:'赋役编管',cultural:'文化治理'};
export function policyDefinition(dimension:PolicyDimension,rule:string):{name:string;effect:string}|undefined {
 const entries=policyDefinitions[dimension] as Record<string,{name:string;effect:string}>;
 return entries&&Object.hasOwn(entries,rule)?entries[rule]:undefined;
}

/** Comparable summaries of implemented rules; values are gameplay parameters. */
export const culturalPolicyTradeoffs:Record<CulturalPolicy,Record<string,string>>={
 customs:{任用:'文化差异评价 −4；能力与履历另计',征收:'统一赋役清税 +15 工作量，无额外实收',军务:'在任将领交接评价 +6；撤销优待可能引发诉求'},
 inclusive:{任用:'文化差异不扣分',征收:'无额外工作量或实收加成',军务:'无专属交接加成；原待遇撤销仍须处置'},
 integration:{任用:'文化差异评价 −4；能力与履历另计',征收:'清税 +15 工作量；详办且质量达标实收 +5%，当地豁免除外',军务:'撤销旧俗形成真实诉求时，组织者交接评价 −6'},
};
