/** Original game balance, not historical facts or CK3 values. Percentages add against the base. */
export const lifestyleBranches={
 stewardship:{name:'管理',icon:'city',description:'职责内理政，或经营自己的家业',affinity:['frugal','diligent']},
 diplomacy:{name:'外交',icon:'gregarious',description:'奉使交邦，或经营朋友与亲族',affinity:['gregarious','generous']},
 martial:{name:'军事',icon:'army',description:'统率公军，或修武供养自己的部曲',affinity:['diligent','steadfast']},
 intrigue:{name:'谋略',icon:'wary',description:'辅政反制，或暗中经营个人势力',affinity:['wary','ambitious']},
} as const;
export type LifestyleBranch=keyof typeof lifestyleBranches;
export type LifestyleScope='common'|'public'|'private';
export interface LifestyleBonus {
 attack:number;supply:number;armyExpense:number;siege:number;buildCost:number;buildTime:number;tax:number;grain:number;
 acceptance:number;giftCost:number;giftOpinion:number;scheme:number;calm:number;intrigueSuccess:number;intrigueSecrecy:number;hostileSuccess:number;personalSuccess:number;
 estateBuildCost:number;estateBuildTime:number;estateLoss:number;estateWorkshop:number;estateSettleCost:number;estateRetention:number;
 envoyScore:number;envoyTime:number;publicTask:number;publicIntrigue:number;counterIntrigue:number;personalDefense:number;
 privateAttack:number;privateSupply:number;privateExpense:number;
}
export const emptyLifestyleBonus=():LifestyleBonus=>({attack:0,supply:0,armyExpense:0,siege:0,buildCost:0,buildTime:0,tax:0,grain:0,acceptance:0,giftCost:0,giftOpinion:0,scheme:0,calm:0,intrigueSuccess:0,intrigueSecrecy:0,hostileSuccess:0,personalSuccess:0,estateBuildCost:0,estateBuildTime:0,estateLoss:0,estateWorkshop:0,estateSettleCost:0,estateRetention:0,envoyScore:0,envoyTime:0,publicTask:0,publicIntrigue:0,counterIntrigue:0,personalDefense:0,privateAttack:0,privateSupply:0,privateExpense:0});
interface Focus {branch:LifestyleBranch;scope:'public'|'private';name:string;effect:string;bonus:Partial<LifestyleBonus>;legacy?:boolean}
const focuses:Record<string,Focus>={
 public_stewardship:{branch:'stewardship',scope:'public',name:'经世理政',effect:'亲治公款收入 +3%；承办公务效能 +1',bonus:{tax:3,publicTask:1}},
 private_stewardship:{branch:'stewardship',scope:'private',name:'治产持家',effect:'本人庄园造价 -3%；安置庄户钱费 -3%',bonus:{estateBuildCost:3,estateSettleCost:3}},
 public_diplomacy:{branch:'diplomacy',scope:'public',name:'奉使交邦',effect:'本人作为使者交涉评分 +3',bonus:{envoyScore:3}},
 private_diplomacy:{branch:'diplomacy',scope:'private',name:'交游结亲',effect:'本人交往接受度 +3；月度减压 +1',bonus:{acceptance:3,calm:1}},
 public_martial:{branch:'martial',scope:'public',name:'统军经武',effect:'本人统率公军伤害 +3%；军粮 -3%',bonus:{attack:3,supply:3}},
 private_martial:{branch:'martial',scope:'private',name:'修武蓄众',effect:'本人私钱供养自有私军军饷 -3%；抵御绑架谋害 +3',bonus:{privateExpense:3,personalDefense:3}},
 public_intrigue:{branch:'intrigue',scope:'public',name:'谋国辅政',effect:'合法辅政游说 +3；职责内反制计谋 +3',bonus:{publicIntrigue:3,counterIntrigue:3}},
 private_intrigue:{branch:'intrigue',scope:'private',name:'谋身营势',effect:'本人隐秘计谋成功 +3；暴露 -3 个百分点',bonus:{intrigueSuccess:3,intrigueSecrecy:3}},
};
/** Aliases accept old commands/saves; only eight canonical focuses appear in the UI. */
export const legacyFocusMap:Record<string,string>={architecture:'private_stewardship',domain:'public_stewardship',agriculture:'public_stewardship',etiquette:'private_diplomacy',generosity:'private_diplomacy',family:'private_diplomacy',strategy:'public_martial',supply:'public_martial',command:'public_martial',intelligence:'public_intrigue',subterfuge:'private_intrigue',coercion:'private_intrigue'};
export const lifestyleFocuses:Record<string,Focus>={...focuses,...Object.fromEntries(Object.entries(legacyFocusMap).map(([id,next])=>[id,{...focuses[next],legacy:true}]))};
export interface LifestylePerk {branch:LifestyleBranch;scope:LifestyleScope;name:string;effect:string;requires:string[];bonus:Partial<LifestyleBonus>;tier:number;side:0|1;mastery?:boolean}
const perk=(branch:LifestyleBranch,scope:LifestyleScope,name:string,effect:string,bonus:Partial<LifestyleBonus>,requires:string[]=[],tier=0,mastery=false):LifestylePerk=>({branch,scope,name,effect,bonus,requires,tier,side:scope==='private'?1:0,...(mastery?{mastery:true}:{})});
export const lifestylePerks:Record<string,LifestylePerk>={
 // Existing IDs and prerequisite paths remain valid. Common skills are optional.
 surveying:perk('stewardship','common','审度物料','公私新工程各自造价 -3%',{buildCost:3,estateBuildCost:3}),
 orderly:perk('stewardship','common','筹划有序','公私新工程各自工期 -3%',{buildTime:3,estateBuildTime:3}),
 ledgers:perk('stewardship','public','明核账籍','亲自治理公款收入 +3%',{tax:3}),
 frugal_office:perk('stewardship','public','量入为出','职责内新工程造价 -3%',{buildCost:3}),
 husbandry:perk('stewardship','public','劝课农桑','亲治县域收成 +3%，同批庄粮依规则分配',{grain:3}),
 crews:perk('stewardship','public','统筹工役','职责内新工程工期 -5%',{buildTime:5},['surveying'],1),
 relief_order:perk('stewardship','public','赈济有方','承办公务效能 +1',{publicTask:1},['frugal_office'],1),
 review_officers:perk('stewardship','public','察吏问绩','承办公务效能 +1',{publicTask:1},['ledgers'],1),
 orderly_tax:perk('stewardship','public','整饬赋役','亲自治理公款收入 +4%',{tax:4},['review_officers'],2),
 cooperation:perk('stewardship','public','上下协理','承办公务效能 +1；职责内工期 -3%',{publicTask:1,buildTime:3},['relief_order'],2),
 administrator:perk('stewardship','public','经世者','亲治公款收入 +3%；职责内造价 -3%',{tax:3,buildCost:3},['husbandry','ledgers'],2,true),
 household_accounts:perk('stewardship','private','核算家资','本人庄园营建造价 -3%',{estateBuildCost:3}),
 estate_fields:perk('stewardship','private','整治田庄','本人庄园安置钱费 -5%',{estateSettleCost:5}),
 lenient_tenants:perk('stewardship','private','宽租留户','宽缓租额时庄户脱离减幅 10%',{estateRetention:10}),
 estate_stores:perk('stewardship','private','仓廪有备','本人庄粮保管损耗 -10%，不减溢出',{estateLoss:10},['household_accounts'],1),
 estate_workshop:perk('stewardship','private','经营作坊','本人实际作坊加工收入 +5%',{estateWorkshop:5},['estate_fields'],1),
 estate_projects:perk('stewardship','private','庄务统筹','本人庄园新工程工期 -5%',{estateBuildTime:5},['lenient_tenants'],1),
 settle_tenants:perk('stewardship','private','安置庄客','本人庄园安置钱费 -7%',{estateSettleCost:7},['estate_stores'],2),
 household_enterprise:perk('stewardship','private','家业统筹','本人作坊收入 +5%；庄粮保管损耗 -5%',{estateWorkshop:5,estateLoss:5},['estate_workshop'],2),
 estate_master:perk('stewardship','private','治产名家','本人庄园造价 -3%；宽租脱离减幅 +10%',{estateBuildCost:3,estateRetention:10},['estate_projects','estate_workshop'],2,true),
 courtesy:perk('diplomacy','common','通晓礼数','本人交往接受度 +3；使者评分 +2',{acceptance:3,envoyScore:2}),
 measured_words:perk('diplomacy','common','言辞有度','本人交往接受度 +2；使者评分 +2',{acceptance:2,envoyScore:2}),
 envoy_rites:perk('diplomacy','public','奉使知礼','本人作为使者评分 +3',{envoyScore:3}),
 envoy_preparation:perk('diplomacy','public','交涉筹备','本人使团交涉日数 -5%，不减行程',{envoyTime:5}),
 good_neighbor:perk('diplomacy','public','睦邻修好','本人作为使者评分 +2',{envoyScore:2}),
 treaty_words:perk('diplomacy','public','折冲议约','本人作为使者评分 +4',{envoyScore:4},['envoy_rites'],1),
 receive_envoys:perk('diplomacy','public','应对有节','本人使团交涉日数 -5%',{envoyTime:5},['envoy_preparation'],1),
 coordinate_allies:perk('diplomacy','public','协和盟友','承办外交公务效能 +1；使者评分 +2',{publicTask:1,envoyScore:2},['good_neighbor'],1),
 envoy_aid:perk('diplomacy','public','争取援助','本人作为使者评分 +3',{envoyScore:3},['treaty_words'],2),
 envoy_mediation:perk('diplomacy','public','斡旋邦交','本人使团交涉日数 -5%；评分 +2',{envoyTime:5,envoyScore:2},['receive_envoys'],2),
 envoy_master:perk('diplomacy','public','纵横家','本人使团评分 +4，不授予缔约权',{envoyScore:4},['coordinate_allies','treaty_words'],2,true),
 gifting:perk('diplomacy','private','投其所好','本人赠礼钱费 -5%',{giftCost:5},['courtesy']),
 mediation:perk('diplomacy','private','善结人缘','本人赠礼额外好感 +2',{giftOpinion:2},['courtesy']),
 family_rites:perk('diplomacy','private','亲族礼仪','本人交往与议婚接受度 +3',{acceptance:3}),
 patience:perk('diplomacy','private','循循相交','本人新交好成功 +3 个百分点',{scheme:3},['gifting'],1),
 hospitality:perk('diplomacy','private','款待宾客','本人赠礼钱费 -5%；好感 +1',{giftCost:5,giftOpinion:1},['family_rites'],1),
 introductions:perk('diplomacy','private','引荐贤才','本人交往接受度 +3',{acceptance:3},['mediation'],1),
 soothe_relations:perk('diplomacy','private','调解嫌隙','本人新交好成功 +4 个百分点',{scheme:4},['hospitality'],2),
 kinship_calm:perk('diplomacy','private','敦亲睦族','本人每月额外减压 2',{calm:2},['introductions'],2),
 network:perk('diplomacy','private','四海知交','本人交往接受度 +4；赠礼好感 +2',{acceptance:4,giftOpinion:2},['patience','mediation'],2,true),
 martial_foundation:perk('martial','common','临阵审势','本人实际统率军队伤害 +2%',{attack:2,privateAttack:2}),
 martial_discipline:perk('martial','common','持重有备','本人实际统率军队耗粮 -2%',{supply:2,privateSupply:2}),
 drill:perk('martial','public','整训部伍','本人统率公军伤害 +3%',{attack:3}),
 public_discipline:perk('martial','public','明肃军纪','本人统率公军军饷 -3%',{armyExpense:3}),
 public_supply:perk('martial','public','军需有序','本人统率公军耗粮 -3%',{supply:3}),
 logistics:perk('martial','public','粮道筹算','本人统率公军耗粮 -5%',{supply:5},['drill'],1),
 siegecraft:perk('martial','public','攻城法度','本人统率公军围城日数 -5%',{siege:5},['drill'],1),
 public_coordination:perk('martial','public','诸军协同','本人承办军务效能 +1',{publicTask:1},['public_discipline'],1),
 veterans:perk('martial','public','久练成军','本人统率公军军饷 -5%',{armyExpense:5},['logistics'],2),
 sustained_war:perk('martial','public','持久经武','本人统率公军耗粮 -3%；军饷 -3%',{supply:3,armyExpense:3},['public_coordination'],2),
 strategist:perk('martial','public','兵略家','本人统率公军伤害 +4%；围城日数 -4%',{attack:4,siege:4},['veterans','siegecraft'],2,true),
 personal_guard:perk('martial','private','随身警备','本人抵御绑架与谋害 +3',{personalDefense:3}),
 private_drill:perk('martial','private','修武练众','本人统率自己私军伤害 +3%',{privateAttack:3}),
 private_provision:perk('martial','private','部曲供养','本人私钱供养自有私军军饷 -3%',{privateExpense:3}),
 guard_vigilance:perk('martial','private','护卫相习','本人抵御绑架与谋害 +4',{personalDefense:4},['personal_guard'],1),
 private_logistics:perk('martial','private','蓄粮养众','本人统率自有私军耗粮 -5%',{privateSupply:5},['private_drill'],1),
 private_welfare:perk('martial','private','抚恤有方','本人私钱供养自有私军军饷 -4%',{privateExpense:4},['private_provision'],1),
 private_cohesion:perk('martial','private','部曲归心','本人统率自有私军伤害 +4%',{privateAttack:4},['guard_vigilance'],2),
 private_recovery:perk('martial','private','败后整队','本人亲统自有私军耗粮 -3%；抵御绑架谋害 +2',{privateSupply:3,personalDefense:2},['private_logistics'],2),
 private_commander:perk('martial','private','部曲之主','本人私钱供养自有私军军饷 -4%；亲统伤害 +3%',{privateExpense:4,privateAttack:3},['private_welfare','private_logistics'],2,true),
 persuasion:perk('intrigue','common','揣摩游说','本人计谋成功 +2；合法辅政游说 +2',{intrigueSuccess:2,publicIntrigue:2}),
 discernment:perk('intrigue','common','审势知人','本人反制计谋 +2',{counterIntrigue:2}),
 public_observation:perk('intrigue','public','察情辨势','职责内反制计谋 +3',{counterIntrigue:3}),
 public_persuasion:perk('intrigue','public','谋国游说','合法辅政游说评分 +3',{publicIntrigue:3}),
 protect_court:perk('intrigue','public','护持要人','职责内反制计谋 +3',{counterIntrigue:3}),
 resist_division:perk('intrigue','public','识破离间','职责内反制计谋 +3',{counterIntrigue:3},['public_observation'],1),
 execute_policy:perk('intrigue','public','落实方略','本人承办公务效能 +1',{publicTask:1},['public_persuasion'],1),
 political_commitment:perk('intrigue','public','协理政议','合法辅政游说评分 +4',{publicIntrigue:4},['protect_court'],1),
 stabilize_support:perk('intrigue','public','稳固支持','合法辅政游说评分 +3',{publicIntrigue:3},['resist_division'],2),
 counter_threat:perk('intrigue','public','反制威胁','职责内反制计谋 +4',{counterIntrigue:4},['execute_policy'],2),
 public_strategist:perk('intrigue','public','谋国之士','合法辅政游说 +3；职责内反制 +3',{publicIntrigue:3,counterIntrigue:3},['political_commitment','execute_policy'],2,true),
 observers:perk('intrigue','private','察言观色','本人个人计谋成功 +3 个百分点',{personalSuccess:3}),
 secret_contacts:perk('intrigue','private','暗中联络','本人计谋暴露 -3 个百分点',{intrigueSecrecy:3}),
 favors:perk('intrigue','private','经营人情','本人个人计谋成功 +2 个百分点',{personalSuccess:2}),
 cover:perk('intrigue','private','掩迹藏锋','本人计谋暴露 -4 个百分点',{intrigueSecrecy:4},['observers'],1),
 inside_contacts:perk('intrigue','private','内应接引','本人计谋成功 +3 个百分点',{intrigueSuccess:3},['secret_contacts'],1),
 secret_recruit:perk('intrigue','private','密约拉拢','本人个人计谋成功 +3 个百分点',{personalSuccess:3},['favors'],1),
 leverage:perk('intrigue','private','因势制人','本人敌对计谋成功 +4 个百分点',{hostileSuccess:4},['cover'],2),
 discreet_exit:perk('intrigue','private','谋后自保','本人计谋暴露 -3；抵御绑架谋害 +2',{intrigueSecrecy:3,personalDefense:2},['inside_contacts'],2),
 schemer:perk('intrigue','private','谋略家','本人计谋成功 +3；暴露 -3 个百分点',{intrigueSuccess:3,intrigueSecrecy:3},['leverage','persuasion'],2,true),
};
/** Validate old saves against their original graph before migrating to the expanded graph. */
export const legacyPerkPrereqs:Record<string,string[]>={observers:[],cover:['observers'],persuasion:['observers'],leverage:['cover'],schemer:['leverage','persuasion'],drill:[],logistics:['drill'],siegecraft:['drill'],veterans:['logistics'],strategist:['veterans','siegecraft'],surveying:[],crews:['surveying'],ledgers:['surveying'],husbandry:['crews'],administrator:['husbandry','ledgers'],courtesy:[],gifting:['courtesy'],mediation:['courtesy'],patience:['gifting'],network:['patience','mediation']};
export const LIFESTYLE_XP_PER_POINT=360;
export const LIFESTYLE_SWITCH_DAYS=90;
export const LIFESTYLE_MONTHLY_BASE=18;
export const LIFESTYLE_MONTHLY_CAP=22;
export const branchPerks=(branch:LifestyleBranch)=>Object.entries(lifestylePerks).filter(([,p])=>p.branch===branch);
export const branchFocuses=(branch:LifestyleBranch)=>Object.entries(focuses).filter(([,f])=>f.branch===branch);
