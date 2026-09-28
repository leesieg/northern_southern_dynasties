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
export const policyDefinitions = {appointment:appointmentPolicies,access:accessPolicies,registration:registrationPolicies};
export type PolicyDimension = keyof typeof policyDefinitions;
export type AppointmentPolicy = keyof typeof appointmentPolicies;
export type AccessPolicy = keyof typeof accessPolicies;
export type RegistrationPolicy = keyof typeof registrationPolicies;
export const policyDimensions:PolicyDimension[]=['appointment','access','registration'];
export const policyLabels:Record<PolicyDimension,string>={appointment:'任官准则',access:'任职通道',registration:'赋役编管'};
export function policyDefinition(dimension:PolicyDimension,rule:string):{name:string;effect:string}|undefined {
 const entries=policyDefinitions[dimension] as Record<string,{name:string;effect:string}>;
 return entries&&Object.hasOwn(entries,rule)?entries[rule]:undefined;
}
