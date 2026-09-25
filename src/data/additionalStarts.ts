import {expandedPeople} from './expandedPeople';
import type {HistoricalCharacter} from './characters';
// Reuse registered scenario biographies and residences; no later offices are backdated.
export const additionalStarts:HistoricalCharacter[]=[
 ...expandedPeople.map(p=>({id:p.id,name:p.name,family:p.family,polity:p.realm,title:p.role==='scholar'?'士人':p.role==='prince'?'宗室':'将领',role:p.role,home:p.home,biography:p.note,sources:p.fictional?[]:[p.source]})),
 {id:'chen-baxian',name:'陈霸先',family:'chen-yingchuan',polity:'liang',title:'梁朝将领',role:'commander',home:'jiankang',biography:'梁朝将领，出身吴兴长城。',sources:[{title:'《陈书》卷一',url:'https://zh.wikisource.org/wiki/陳書/卷01'}]},
 {id:'yuwen-hu',name:'宇文护',family:'yuwen',polity:'west',title:'西魏将领',role:'commander',home:'changan',biography:'宇文泰之侄，西魏将领。',sources:[{title:'《周书》卷十一',url:'https://zh.wikisource.org/wiki/周書/卷11'}]},
 {id:'yuan-kuo',name:'元廓',family:'yuan',polity:'west',title:'宗室',role:'prince',home:'changan',biography:'元宝炬之子。',sources:[{title:'《北史》卷五',url:'https://zh.wikisource.org/wiki/北史/卷005'}]},
 {id:'yuwen-jue',name:'宇文觉',family:'yuwen',polity:'west',title:'宗室',role:'prince',home:'changan',biography:'宇文泰之子，尚未成年。',sources:[{title:'《周书》卷三',url:'https://zh.wikisource.org/wiki/周書/卷03'}]},
 {id:'xiao-fangzhi',name:'萧方智',family:'xiao',polity:'liang',title:'宗室',role:'prince',home:'xunyang',biography:'萧绎之子，尚未成年。',sources:[{title:'《梁书》卷六',url:'https://zh.wikisource.org/wiki/梁書/卷06'}]},
 ...([{id:'wang-lingbin',name:'王灵宾',family:'wang-langya',polity:'liang',title:'皇太子妃',home:'jiankang',book:'梁書/卷07'}, {id:'xu-zhaopei',name:'徐昭佩',family:'xu-donghai',polity:'liang',title:'湘东王妃',home:'xunyang',book:'梁書/卷07'}, {id:'lou-zhaojun',name:'娄昭君',family:'lou-daijun',polity:'east',title:'高欢夫人',home:'jinyang',book:'北齊書_(四庫全書本)/卷09'}] as const).map(p=>({...p,role:'prince' as const,biography:p.title,sources:[{title:p.book,url:'https://zh.wikisource.org/wiki/'+p.book}]})),
 ...(['liang','east','west'] as const).map((polity,i)=>({id:'guest-'+polity,name:['顾静蘅','韩令仪','陆明徽'][i],family:'fictional-house-'+polity,polity,title:'世家人物',role:'scholar' as const,home:['jiankang','ye','changan'][i],biography:'架空成年人物，不挂接真实历史谱系。',sources:[]})),
];
