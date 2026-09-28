/** Inspired by CK3's Celestial Ministry / Political Movements; all numbers and affiliations are game design. */
export const movementIds=['dynastic','expansion','reform','conservative','unaligned'] as const;
export type MovementId=typeof movementIds[number];
export const movements:Record<MovementId,{name:string;goal:string}>={
 dynastic:{name:'拥朝派',goal:'维护当前君主，恢复天命与朝野支持。'},expansion:{name:'开拓派',goal:'加强军务，推动开拓方向。'},
 reform:{name:'经世派',goal:'整顿财政、兴修营建，推动经世方向。'},conservative:{name:'守成派',goal:'重视考课、监察与秩序，推动守成方向。'},unaligned:{name:'未结党',goal:'不支持特定集团，可以游说加入。'},
};
export const ministryIds=['secretariat','personnel','finance','military','censorate'] as const;
export type MinistryId=typeof ministryIds[number];
export const ministries:Record<MinistryId,{name:string;duty:string;effect:string}>={
 secretariat:{name:'中枢统筹',duty:'协调朝政',effect:'称职时每月朝野支持 +2'},personnel:{name:'选官职掌',duty:'选任与考课',effect:'称职时，在任善治的月度考绩 +1'},
 finance:{name:'度支职掌',duty:'财政与公库',effect:'称职时公库税收 +8%'},military:{name:'军务职掌',duty:'军备与军饷',effect:'称职时军饷 −8%'},censorate:{name:'监察职掌',duty:'纠察与清议',effect:'称职时每月积弊 −5'},
};
export const phaseIds=['stable','strained','chaos'] as const;
export type CourtPhase=typeof phaseIds[number];
export const phases:Record<CourtPhase,{name:string;effect:string}>={stable:{name:'安定',effect:'施政方向增益生效'},strained:{name:'动荡',effect:'税收 −10%，施政方向增益暂停'},chaos:{name:'危局',effect:'税收 −25%，军饷 +15%，改革暂停；开放拥立条件'}};
export const policyIds=['consolidation','expansion','reform'] as const;
export type CourtPolicy=typeof policyIds[number];
export const policies:Record<CourtPolicy,{name:string;effect:string}>={consolidation:{name:'守成',effect:'安定时每月积弊 −1'},expansion:{name:'开拓',effect:'安定时攻击 +10%，军饷 +5%'},reform:{name:'经世',effect:'安定时税收 +8%，攻击 −5%'}};
export const courtReference={title:'CK3《溥天之下》',url:'https://www.paradoxinteractive.com/games/crusader-kings-iii/add-ons/crusader-kings-iii-all-under-heaven'};
