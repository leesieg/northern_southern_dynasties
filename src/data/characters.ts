import type { Polity } from '../core/types';
export type CharacterRole='ruler'|'regent'|'prince'|'commander';
export interface HistoricalCharacter {
  id:string;name:string;family:string;polity:Exclude<Polity,'frontier'>;title:string;role:CharacterRole;home:string;
  biography:string;sources:{title:string;url:string}[];
}
const source=(title:string,path:string)=>({title,url:'https://zh.wikisource.org/wiki/'+path});
const liang3=source('《梁书》卷三','梁書/卷03'),liang4=source('《梁书》卷四','梁書/卷04'),liang5=source('《梁书》卷五','梁書/卷05');
const qi2=source('《北齐书》卷二','北齊書_(四庫全書本)/卷02'),qi3=source('《北齐书》卷三','北齊書/卷3'),qi4=source('《北齐书》卷四','北齊書/卷4');
const wei12=source('《魏书》卷十二','魏書/卷12'),bei5=source('《北史》卷五','北史/卷005'),zhou2=source('《周书》卷二','周書/卷02');
export const historicalCharacters:HistoricalCharacter[]=[
  {id:'dugu-xin',name:'独孤信',family:'dugu',polity:'west',title:'秦州刺史 · 陇右将领',role:'commander',home:'tianshui',biography:'西魏将领，曾任陇右十州大都督、秦州刺史，经营陇右。546 年参与平定凉州宇文仲和之乱；本局以秦州治所天水为营建锚点。',sources:[source('《周书》卷十六','周書_(四庫全書本)/卷16'),bei5]},
  {id:'xiao-yan',name:'萧衍',family:'xiao',polity:'liang',title:'梁皇帝',role:'ruler',home:'jiankang',biography:'梁的在位皇帝，朝廷位于建康。萧纲为皇太子，萧绎为在外任职的宗室。此处采用 546 年身份，不以身后谥号作为当时称号。',sources:[liang3,liang4,liang5]},
  {id:'xiao-gang',name:'萧纲',family:'xiao',polity:'liang',title:'梁皇太子',role:'prince',home:'jiankang',biography:'萧衍第三子，531 年被立为皇太子，546 年仍居储位。',sources:[liang4]},
  {id:'xiao-yi',name:'萧绎',family:'xiao',polity:'liang',title:'湘东王 · 江州刺史',role:'prince',home:'xunyang',biography:'萧衍第七子，封湘东王。540 年出任江州刺史，547 年才转任荆州刺史；546 年开局以寻阳作为江州治所锚点，不能前置后来的江陵政局。',sources:[liang5]},
  {id:'yuan-shanjian',name:'元善见',family:'yuan',polity:'east',title:'东魏皇帝',role:'ruler',home:'ye',biography:'534 年被拥立，东魏迁都邺城。546 年名义上为皇帝，军政权力主要掌握在高氏手中；皇帝身份不等于独立控制所有军政资源。',sources:[wei12,qi2]},
  {id:'gao-huan',name:'高欢',family:'gao',polity:'east',title:'渤海王 · 东魏执政',role:'regent',home:'jinyang',biography:'东魏实际掌权者，晋阳为其重要军政据点。高澄参与朝政，高洋亦已任职；546 年尚不能把高氏标为北齐皇室。',sources:[qi2,qi3,qi4]},
  {id:'gao-cheng',name:'高澄',family:'gao',polity:'east',title:'渤海王世子 · 大将军',role:'regent',home:'ye',biography:'高欢长子，入辅东魏朝政，参与选官与整顿吏治。546 年高欢尚在，不能将次年的继掌大权与王爵直接前置。',sources:[qi3]},
  {id:'gao-yang',name:'高洋',family:'gao',polity:'east',title:'太原公 · 尚书左仆射',role:'prince',home:'ye',biography:'高欢第二子、高澄同母弟，544 年转尚书左仆射、领军将军。546 年属于东魏高氏权贵，尚未建立北齐。',sources:[qi4]},
  {id:'yuan-baoju',name:'元宝炬',family:'yuan',polity:'west',title:'西魏皇帝',role:'ruler',home:'changan',biography:'535 年即位，西魏以长安为都。546 年在位，朝政大权倚重宇文泰；元钦为皇太子。',sources:[bei5,zhou2]},
  {id:'yuwen-tai',name:'宇文泰',family:'yuwen',polity:'west',title:'西魏执政',role:'regent',home:'changan',biography:'辅佐西魏、主持军政与制度整顿。546 年仍属西魏，不能以北周已经建立的身份开局。长安是玩法锚点，不断言其开局当日驻地。',sources:[zhou2]},
  {id:'yuan-qin',name:'元钦',family:'yuan',polity:'west',title:'西魏皇太子',role:'prince',home:'changan',biography:'元宝炬长子，535 年被立为皇太子。546 年仍在储位，尚未即位。',sources:[bei5]},
];
export const characterById:Record<string,HistoricalCharacter>=Object.fromEntries(historicalCharacters.map(c=>[c.id,c]));
export const familyNames:Record<string,string>={shen:'沈',xiao:'萧',yuan:'元',gao:'高',yuwen:'宇文',dugu:'独孤'};
export const familyName=(id:string)=>familyNames[id]??'家族';
export const roleNames:Record<CharacterRole,string>={ruler:'君主',regent:'执政',prince:'宗室',commander:'将领'};
// Only sourced relations among the current roster. Absence does not assert no kinship.
export const characterRelations=[
  {from:'yuan-shanjian',to:'gao-huan',kind:'辅政',source:qi2},
  {from:'yuan-baoju',to:'yuwen-tai',kind:'辅政',source:zhou2},
  {from:'yuwen-tai',to:'dugu-xin',kind:'统属',source:source('《周书》卷十六','周書_(四庫全書本)/卷16')},
  {from:'xiao-yan',to:'xiao-gang',kind:'父子',source:liang4},
  {from:'xiao-yan',to:'xiao-yi',kind:'父子',source:liang5},
  {from:'gao-huan',to:'gao-cheng',kind:'父子',source:qi3},
  {from:'gao-huan',to:'gao-yang',kind:'父子',source:qi4},
  {from:'gao-cheng',to:'gao-yang',kind:'兄弟',source:qi4},
  {from:'yuan-baoju',to:'yuan-qin',kind:'父子',source:bei5},
];
export function relationsFor(id:string){return characterRelations.filter(r=>r.from===id||r.to===id).map(r=>({id:r.from===id?r.to:r.from,label:r.kind==='父子'?(r.from===id?'子':'父'):r.kind==='兄弟'?(r.from===id?'弟':'兄'):r.kind==='辅政'?(r.from===id?'辅政者':'奉事君主'):(r.from===id?'麾下将领':'军政统领'),source:r.source}));}
export function startRules(c:HistoricalCharacter){return c.role==='ruler'?{coins:520,food:120,market:2,granary:1,hostel:0}:(c.role==='regent'||c.role==='commander')?{coins:420,food:100,market:1,granary:2,hostel:0}:{coins:260,food:90,market:1,granary:0,hostel:1};}
