/** Original simulation tasks and balance, not assertions about particular historical events. */
export const servicePriorities={economy:'富民经世',stability:'安民整饬',military:'整备军务',diplomacy:'敦睦邦交'} as const;
export type ServicePriority=keyof typeof servicePriorities;
export const assignmentTemplates={
 relief:{name:'赈济安民',category:'stability',skill:'stewardship',coins:35,grain:70,work:160,icon:'grain',description:'开仓赈济，稳住民心。',effect:'秩序最多 +14，户数 +8'},
 agriculture:{name:'劝课农桑',category:'economy',skill:'stewardship',coins:65,grain:25,work:200,icon:'grain',description:'修整沟渠，劝课农桑。',effect:'繁荣最多 +10，户数 +12'},
 commerce:{name:'整顿市务',category:'economy',skill:'stewardship',coins:60,grain:0,work:180,icon:'coins',description:'查验度量，疏通商路。',effect:'繁荣最多 +8，完成时公款 +85'},
 training:{name:'操练军伍',category:'military',skill:'martial',coins:70,grain:40,work:180,icon:'army',description:'整顿驻军，习练行阵。',effect:'本城驻军士气最多 +18、兵员最多 +60'},
 supply:{name:'军粮转运',category:'military',skill:'martial',coins:40,grain:120,work:180,icon:'grain',description:'从国都向驻军所在城转运军粮。',effect:'本城驻军补给最多 +90'},
 inspection:{name:'巡察吏治',category:'stability',skill:'intrigue',coins:45,grain:10,work:180,icon:'wary',description:'巡视官署，清查积弊。',effect:'秩序最多 +10，朝廷积弊最多 −8'},
 envoy:{name:'通使修好',category:'diplomacy',skill:'diplomacy',coins:65,grain:15,work:180,icon:'gregarious',description:'筹办国书与使团，商议修好。',effect:'派出修好使团，获接纳后两国关系最多 +25；不附带通行权'},
 marketworks:{name:'营建市肆',category:'economy',skill:'stewardship',coins:120,grain:20,work:220,icon:'city',description:'由中枢或度支官员组织工匠营建市肆。',effect:'市肆提升 1 级，最高 3 级'},
 granaryworks:{name:'营建城仓',category:'economy',skill:'stewardship',coins:100,grain:20,work:200,icon:'grain',description:'由中枢或度支官员组织修建城仓。',effect:'城仓提升 1 级，最高 3 级'},
 hostelworks:{name:'营建驿舍',category:'economy',skill:'stewardship',coins:110,grain:20,work:210,icon:'city',description:'由中枢或度支官员组织修建驿舍。',effect:'驿舍提升 1 级，最高 3 级'},
 greatworks:{name:'兴修水利',category:'economy',skill:'stewardship',coins:180,grain:80,work:400,icon:'estate',description:'由中枢官员主持疏渠筑堰，组织大型水利工程。',effect:'繁荣 +20、秩序 +10、户数 +80'},
 recruitment:{name:'征募兵员',category:'military',skill:'martial',coins:100,grain:80,work:220,icon:'army',description:'由军务或选官职掌主持军户征募。',effect:'补充驻军 200 人；无驻军时组建 200 人军队，消耗 20 户与 5 秩序'},
 taxation:{name:'清查征税',category:'economy',skill:'stewardship',coins:30,grain:0,work:180,icon:'coins',description:'由度支或监察官员清查欠赋，按本城户数与税制征收。',effect:'公款增加 30—150，秩序 −5，每城每季限一次'},
} as const;
export type AssignmentKind=keyof typeof assignmentTemplates;
export const assignmentPlans={balanced:{name:'按部就班',cost:100,work:100,description:'按常额拨款与工期办理。'},thorough:{name:'从容详办',cost:80,work:125,description:'预算为常额的八成，工作量增加四分之一。'},urgent:{name:'增拨赶办',cost:140,work:80,description:'预算为常额的一点四倍，工作量减少五分之一。'}} as const;
export type AssignmentPlan=keyof typeof assignmentPlans;
export const assignmentPhases={petition:'待准请命',proposal:'拟定方案',approval:'待批预算',ready:'待启办',working:'办理中',incident:'阻碍待决',aid:'待复求援',report:'待考绩',closed:'已结案'} as const;
export type AssignmentPhase=keyof typeof assignmentPhases;
export const careerNames={economy:['初涉经世','善治之才','循吏之望','经世名臣'],stability:['初涉安民','整饬有方','清正之望','砥柱之臣'],military:['初涉军务','治军有方','将略之望','柱国之才'],diplomacy:['初涉邦交','善通国事','折冲之望','纵横名士']} as const;
