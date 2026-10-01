import type { RealmId } from '../core/realm';
export const governmentDefinitions={
 meritocratic:{name:'贤能制',subtitle:'官僚功绩与任职',description:'门阀背景下推行铨选、察举与考课。任官依现行准则与通道，功绩达 40 可请军务；任职不随家业继承。',tax:0,pay:0,attack:0},
 celestial:{name:'天朝制',subtitle:'天命与中央官僚',description:'控制至少六成已录非边疆城市后可立制。税收 +15%，军饷 +10%；天命低于 25 时税收转为 −20%，低于 15 时退化为贤能制。',tax:15,pay:10,attack:0},
 nomadic:{name:'游牧制',subtitle:'畜群、逐水草与骑军',description:'需北方驻牧地与 200 畜群。税收 −35%、军饷 −25%、攻击 +15%；动员耗 100 畜群，畜群随季节与驻牧压力变化，可迁营。',tax:-35,pay:-25,attack:15},
 khanate:{name:'宫帐制',subtitle:'草原官僚与宫帐',description:'兼具功绩任职与畜群经营；税收 −10%、军饷 −10%、攻击 +10%。动员耗 50 畜群，可迁营，家业交接不继承官职。',tax:-10,pay:-10,attack:10},
 feudal:{name:'封建制',subtitle:'世袭领有与契约义务',description:'每座城分别选择均衡、税赋或军役契约；家业交接将前任在本国的治理权传给合格亲属。',tax:0,pay:0,attack:0},
 tribal:{name:'部落制',subtitle:'部众拥戴与集会',description:'税收 −25%、军饷 −30%；部众支持至少 50 才可动员，耗 10 支持。军队攻击随支持高低变化，可用集会争取拥戴。',tax:-25,pay:-30,attack:0},
} as const;
export type GovernmentType=keyof typeof governmentDefinitions;
export const governmentTypes=Object.keys(governmentDefinitions) as GovernmentType[];
export const governmentSources=[
 {title:'CK3：All Under Heaven（天朝、贤能与东亚机制）',url:'https://www.paradoxinteractive.com/games/crusader-kings-iii/add-ons/crusader-kings-iii-all-under-heaven'},
 {title:'CK3：Khans of the Steppe（畜群与游牧）',url:'https://www.paradoxinteractive.com/zh-CN/games/crusader-kings-iii/add-ons/crusader-kings-iii-khans-of-the-steppe'},
 {title:'CK3：Roads to Power（行政任职与家族）',url:'https://www.paradoxinteractive.com/games/crusader-kings-iii/add-ons/crusader-kings-iii-roads-to-power'},
];
const source=(title:string,path:string)=>({title,url:'https://zh.wikisource.org/wiki/'+path});
export const reformDefinitions={
 'west-register':{realm:'west',name:'计帐与户籍',year:546,initial:true,requires:[],days:0,cost:0,effect:'开局已行，基础财政包含其制度背景。',history:'苏绰制文案程式及计帐、户籍之法，早于 546 年。',source:source('《周书》卷二十三·苏绰','周書/卷23')},
 'west-six':{realm:'west',name:'六条诏书',year:546,initial:true,requires:['west-register'],days:0,cost:0,effect:'开局已行；后续可整编军制、建置六官。',history:'六条包括治心、教化、地利、贤良、狱讼、赋役。',source:source('《周书》卷二十三·苏绰','周書/卷23')},
 'west-militia':{realm:'west',name:'整编府兵',year:550,initial:false,requires:['west-six'],days:180,cost:240,effect:'军饷 −15%，军队攻击 +10%；支持 −12。',history:'府兵为逐步形成的军事组织；550 是本局开放整编阶段的约定，不断言单一年份创立。',source:source('《周书》卷二·军制演进','周書/卷02')},
 'west-offices':{realm:'west',name:'建置六官',year:556,initial:false,requires:['west-militia'],days:240,cost:300,effect:'税收 +10%；任命须候选人功绩达到 20，朝廷精简后更重考课。',history:'西魏恭帝三年（556）初行周礼，建六官。',source:source('《周书》卷二·六官','周書/卷02')},
 'east-selection':{realm:'east',name:'整顿铨选',year:546,initial:true,requires:[],days:0,cost:0,effect:'开局已行，贤能制功绩任职沿用此制。',history:'高澄入辅朝政、参与选官；不可将 546 年仍为东魏的制度称作北齐既成制度。',source:source('《北齐书》卷三·文襄','北齊書/卷3')},
 'east-censorate':{realm:'east',name:'御史纠察',year:546,initial:true,requires:['east-selection'],days:0,cost:0,effect:'开局已行，可继续推动考课常制。',history:'崔暹任御史中尉，纠察权贵；该制度并非从 546 年才开始。',source:source('《北齐书》卷三十·崔暹','北齊書/卷30')},
 'east-assessment':{realm:'east',name:'推广考课常制',year:546,initial:false,requires:['east-censorate'],days:120,cost:180,effect:'税收 +10%；称职在任者月度功绩由 +2 升至 +4；任命功绩门槛 20。',history:'据铨选与纠察背景设计的可选制度深化，不是史籍中同名同年的独立法令。',source:source('《北齐书》卷三、卷三十', '北齊書/卷30')},
} as const;
export type ReformId=keyof typeof reformDefinitions;
export const reformIds=Object.keys(reformDefinitions) as ReformId[];
export const politicalFigures:Record<string,{name:string;realm:RealmId}>={
 'chen-baxian':{name:'陈霸先',realm:'liang'},'xiao-fangzhi':{name:'萧方智',realm:'liang'},'yuan-kuo':{name:'元廓',realm:'west'},'yuwen-hu':{name:'宇文护',realm:'west'},'yuwen-jue':{name:'宇文觉',realm:'west'},
};
export const successionDefinitions={
 'east-regency':{realm:'east',name:'高洋执掌军政',year:549,previous:null,nextDynasty:null,ruler:'yuan-shanjian',executives:['gao-yang'],prerequisite:'east-censorate',source:source('《北齐书》卷四·文宣','北齊書/卷4'),history:'549 年高澄死后，高洋继掌军政。'},
 'qi-accession':{realm:'east',name:'高洋受禅，建立北齐',year:550,previous:'east-regency',nextDynasty:'qi',ruler:'gao-yang',executives:['gao-yang'],prerequisite:'east-censorate',source:source('《北齐书》卷四·文宣','北齊書/卷4'),history:'550 年高洋代东魏。受禅者是高洋，不是高欢或高澄。'},
 'west-regency':{realm:'west',name:'宇文护总揽朝政',year:556,previous:null,nextDynasty:null,ruler:'yuan-kuo',executives:['yuwen-hu'],prerequisite:'west-offices',source:source('《周书》卷十一·晋荡公护','周書/卷11'),history:'556 年宇文泰死后宇文护掌权；西魏末帝为元廓。'},
 'zhou-accession':{realm:'west',name:'宇文觉受禅，建立北周',year:557,previous:'west-regency',nextDynasty:'zhou',ruler:'yuwen-jue',executives:['yuwen-hu'],prerequisite:'west-offices',source:source('《周书》卷三·孝闵帝','周書/卷03'),history:'557 年宇文觉代西魏，宇文护仍掌实权。'},
 'chen-regency':{realm:'liang',name:'扶立萧方智，陈氏执政',year:555,previous:null,nextDynasty:null,ruler:'xiao-fangzhi',executives:['chen-baxian'],prerequisite:null,source:source('《陈书》卷一·高祖上','陳書/卷1'),history:'555 年陈霸先诛王僧辩，扶立萧方智；此前有侯景之乱与梁室内争。本局此决议只重演执政交替，不代替整场内战。'},
 'chen-accession':{realm:'liang',name:'陈霸先受禅，建立陈朝',year:557,previous:'chen-regency',nextDynasty:'chen',ruler:'chen-baxian',executives:['chen-baxian'],prerequisite:null,source:source('《陈书》卷二·高祖下','陳書/卷2'),history:'557 年梁敬帝萧方智禅位于陈霸先，陈朝建立；西梁等并立政权并未随之自动消失。'},
} as const;
export type SuccessionId=keyof typeof successionDefinitions;
export const successionIds=Object.keys(successionDefinitions) as SuccessionId[];
export const dynastyNames:Record<string,string>={liang:'梁',east:'东魏',west:'西魏',qi:'齐',zhou:'周',chen:'陈'};
// Country names omit later historiographical qualifiers; opening Wei realms keep theirs.
export const canonicalDynastyName=(name:string)=>name==='北齐'?dynastyNames.qi:name==='北周'?dynastyNames.zhou:name;
