import {expandedPeople} from './expandedPeople';
import { historicalCharacters } from './characters';
import { politicalFigures } from './governments';
import type { RealmId } from '../core/realm';
export interface RelationshipPerson {id:string;name:string;realm:RealmId;sex:'male'|'female';adult:boolean;family:string;status:'roster'|'historical'|'fictional';note:string;home?:string;source?:{title:string;url:string}}
const liang={title:'《梁书》卷七',url:'https://zh.wikisource.org/wiki/梁書/卷07'},qi={title:'《北齐书》卷九',url:'https://zh.wikisource.org/wiki/北齊書_(四庫全書本)/卷09'};
export const relationshipPeople:RelationshipPerson[]=[
 ...expandedPeople.map(p=>({id:p.id,name:p.name,realm:p.realm,sex:p.sex,adult:546-p.birth>=16,family:p.family,status:p.fictional?'fictional' as const:'historical' as const,note:p.note,home:p.home,source:p.fictional?undefined:p.source})),
 ...historicalCharacters.map(p=>({id:p.id,name:p.name,realm:p.polity,sex:'male' as const,adult:true,family:p.family,status:'roster' as const,note:'剧本人物；未录婚姻不表示未婚。'})),
 ...Object.entries(politicalFigures).map(([id,p])=>({id,name:p.name,realm:p.realm,sex:'male' as const,adult:['chen-baxian','yuwen-hu'].includes(id),family:id==='chen-baxian'?'chen-yingchuan':id.startsWith('yuwen-')?'yuwen':id.startsWith('xiao-')?'xiao':'yuan',status:'historical' as const,note:id==='chen-baxian'?'梁朝将领，出身吴兴长城。':id==='yuwen-hu'?'宇文泰之侄，西魏将领。':id==='yuwen-jue'?'宇文泰之子，尚未成年。':id==='xiao-fangzhi'?'萧绎之子，尚未成年。':'元宝炬之子。',source:{title:id==='chen-baxian'?'《陈书》卷一':id.startsWith('yuwen-')?'《周书》本纪与列传':id==='xiao-fangzhi'?'《梁书》卷六':'《北史》卷五',url:'https://zh.wikisource.org/wiki/'+(id==='chen-baxian'?'陳書/卷01':id.startsWith('yuwen-')?'周書':id==='xiao-fangzhi'?'梁書/卷06':'北史/卷005')}})),
 {id:'wang-lingbin',name:'王灵宾',realm:'liang',sex:'female',adult:true,family:'wang-langya',status:'historical',note:'546 年为皇太子妃；《梁书》记与萧纲的婚姻。',source:liang},
 {id:'xu-zhaopei',name:'徐昭佩',realm:'liang',sex:'female',adult:true,family:'xu-donghai',status:'historical',note:'517 年拜湘东王妃，546 年与萧绎的已录婚姻。未猜测出生年。',source:liang},
 {id:'lou-zhaojun',name:'娄昭君',realm:'east',sex:'female',adult:true,family:'lou-daijun',status:'historical',note:'高欢的已录配偶、高澄与高洋之母。本局仅纳入此主要配偶关系，不声称覆盖全部姬妾与政治婚姻。',source:qi},
 ...(['liang','east','west'] as const).map((realm,i)=>({id:'guest-'+realm,name:['顾静蘅','韩令仪','陆明徽'][i],realm,sex:'female' as const,adult:true,family:'fictional-house-'+realm,status:'fictional' as const,note:['建康顾氏','邺城韩氏','长安陆氏'][i]+'的架空成年人物，初始未婚，不挂接真实历史谱系。'})),
];
export const relationshipPersonById:Record<string,RelationshipPerson>=Object.fromEntries(relationshipPeople.map(p=>[p.id,p]));
export const historicalMarriages=[{a:'xiao-gang',b:'wang-lingbin',source:liang},{a:'xiao-yi',b:'xu-zhaopei',source:liang},{a:'gao-huan',b:'lou-zhaojun',source:qi}];
export const relationshipParents=[{parent:'lou-zhaojun',child:'gao-cheng'},{parent:'lou-zhaojun',child:'gao-yang'}];
export const relationshipActionNames={gift:'赠礼',pressure:'施压索取人情',befriend:'培养友谊',confidant:'结为至交',rival:'公开决裂',reconcile:'调解仇怨',marry:'缔结婚姻',divorce:'解除婚姻',aid:'请求亲友支援',pledge:'宣誓效忠',recruit:'招纳效忠',renounce:'背弃誓约',release:'解除效忠',control:'筹划挟制君主',tighten:'巩固控制',emancipate:'争取亲政',liberate:'归还政权'} as const;
export type RelationshipAction=keyof typeof relationshipActionNames;
export const friendshipNames={friend:'朋友',confidant:'至交',rival:'仇敌',nemesis:'死敌'};
