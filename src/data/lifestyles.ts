/** Original balance values for this game's day-based pacing; not historical facts or CK3 numbers. */
export const lifestyleBranches={
 martial:{name:'军事',icon:'army',description:'练兵、筹粮、攻守之道',affinity:['diligent','steadfast'],mastery:'兵略家'},
 stewardship:{name:'管理',icon:'city',description:'营建、理财、劝课农桑',affinity:['frugal','diligent'],mastery:'经世者'},
 diplomacy:{name:'交游',icon:'gregarious',description:'礼仪、馈赠、经营人脉',affinity:['gregarious','generous'],mastery:'纵横家'},
} as const;
export type LifestyleBranch=keyof typeof lifestyleBranches;
export interface LifestyleBonus {attack:number;supply:number;armyExpense:number;siege:number;buildCost:number;buildTime:number;tax:number;grain:number;acceptance:number;giftCost:number;giftOpinion:number;scheme:number;calm:number}
export const emptyLifestyleBonus=():LifestyleBonus=>({attack:0,supply:0,armyExpense:0,siege:0,buildCost:0,buildTime:0,tax:0,grain:0,acceptance:0,giftCost:0,giftOpinion:0,scheme:0,calm:0});
interface Focus {branch:LifestyleBranch;name:string;effect:string;bonus:Partial<LifestyleBonus>}
export const lifestyleFocuses:Record<string,Focus>={
 strategy:{branch:'martial',name:'兵法',effect:'野战伤害 +5%',bonus:{attack:5}},
 supply:{branch:'martial',name:'军需',effect:'每日军粮消耗 -5%',bonus:{supply:5}},
 command:{branch:'martial',name:'军纪',effect:'每月 1 日军饷 -5%',bonus:{armyExpense:5}},
 architecture:{branch:'stewardship',name:'营造',effect:'新工程造价 -5%',bonus:{buildCost:5}},
 domain:{branch:'stewardship',name:'理政',effect:'亲自治理城市公款收入 +5%',bonus:{tax:5}},
 agriculture:{branch:'stewardship',name:'农桑',effect:'亲自治理城市公粮产量 +5%',bonus:{grain:5}},
 etiquette:{branch:'diplomacy',name:'礼仪',effect:'人物接受度 +5',bonus:{acceptance:5}},
 generosity:{branch:'diplomacy',name:'宾客',effect:'赠礼费用 -10%',bonus:{giftCost:10}},
 family:{branch:'diplomacy',name:'敦亲',effect:'每月 1 日额外减压 3',bonus:{calm:3}},
};
export interface LifestylePerk {branch:LifestyleBranch;name:string;effect:string;requires:string[];bonus:Partial<LifestyleBonus>;tier:number;side:0|1;mastery?:boolean}
export const lifestylePerks:Record<string,LifestylePerk>={
 drill:{branch:'martial',name:'整训部伍',effect:'野战伤害 +10%',requires:[],bonus:{attack:10},tier:0,side:0},
 logistics:{branch:'martial',name:'粮道筹算',effect:'每日军粮消耗 -15%',requires:['drill'],bonus:{supply:15},tier:1,side:0},
 siegecraft:{branch:'martial',name:'攻城法度',effect:'围城所需日数 -15%',requires:['drill'],bonus:{siege:15},tier:1,side:1},
 veterans:{branch:'martial',name:'久练成军',effect:'每月 1 日军饷 -15%',requires:['logistics'],bonus:{armyExpense:15},tier:2,side:0},
 strategist:{branch:'martial',name:'兵略家',effect:'野战伤害 +10%；围城日数 -10%',requires:['veterans','siegecraft'],bonus:{attack:10,siege:10},tier:3,side:0,mastery:true},
 surveying:{branch:'stewardship',name:'审度物料',effect:'新工程造价 -5%',requires:[],bonus:{buildCost:5},tier:0,side:0},
 crews:{branch:'stewardship',name:'统筹工役',effect:'新工程工期 -10%',requires:['surveying'],bonus:{buildTime:10},tier:1,side:0},
 ledgers:{branch:'stewardship',name:'明核账籍',effect:'亲自治理城市公款收入 +10%',requires:['surveying'],bonus:{tax:10},tier:1,side:1},
 husbandry:{branch:'stewardship',name:'劝课农桑',effect:'亲自治理城市公粮产量 +10%',requires:['crews'],bonus:{grain:10},tier:2,side:0},
 administrator:{branch:'stewardship',name:'经世者',effect:'新工程造价 -5%；亲治城市公款 +5%',requires:['husbandry','ledgers'],bonus:{buildCost:5,tax:5},tier:3,side:0,mastery:true},
 courtesy:{branch:'diplomacy',name:'通晓礼数',effect:'人物接受度 +8',requires:[],bonus:{acceptance:8},tier:0,side:0},
 gifting:{branch:'diplomacy',name:'投其所好',effect:'赠礼费用 -20%',requires:['courtesy'],bonus:{giftCost:20},tier:1,side:0},
 mediation:{branch:'diplomacy',name:'善结人缘',effect:'赠礼额外增加 5 好感',requires:['courtesy'],bonus:{giftOpinion:5},tier:1,side:1},
 patience:{branch:'diplomacy',name:'循循相交',effect:'新交好行动成功率 +10 个百分点，上限 95%',requires:['gifting'],bonus:{scheme:10},tier:2,side:0},
 network:{branch:'diplomacy',name:'纵横家',effect:'人物接受度 +7；每月 1 日额外减压 3',requires:['patience','mediation'],bonus:{acceptance:7,calm:3},tier:3,side:0,mastery:true},
};
export const LIFESTYLE_XP_PER_POINT=360;
export const LIFESTYLE_SWITCH_DAYS=90;
export const branchPerks=(branch:LifestyleBranch)=>Object.entries(lifestylePerks).filter(([,p])=>p.branch===branch);
