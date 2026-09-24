// Facts are sourced separately from geometry. No polygon in this dataset is a surveyed county boundary.
export const historySources={
  qi14:{title:'《南齐书》卷十四·州郡上',url:'https://zh.wikisource.org/wiki/南齊書/卷14',period:'南齐基底，须校核梁代变更'},
  qi15:{title:'《南齐书》卷十五·州郡下',url:'https://zh.wikisource.org/wiki/南齊書/卷15',period:'南齐基底，须校核梁代变更'},
  weiUp:{title:'《魏书》卷一百六上·地形志',url:'https://zh.wikisource.org/wiki/魏書/卷106上',period:'以东魏武定年间为主'},
  weiDown:{title:'《魏书》卷一百六下·地形志',url:'https://zh.wikisource.org/wiki/魏書/卷106下',period:'关中部分沿用较早资料，须校核西魏变更'},
  liang3:{title:'《梁书》卷三·武帝纪下',url:'https://zh.wikisource.org/wiki/梁書/卷03',period:'梁代编年记录'},
} as const;
export interface Administration {
  province:string; prefecture:string; county:string; group:string;
  sources:(keyof typeof historySources)[]; status:'period-source'|'earlier-source'; note:string;
}
const record=(province:string,prefecture:string,county:string,group:string,sources:Administration['sources'],status:Administration['status'],note:string):Administration=>({province,prefecture,county,group,sources,status,note});
export const administration:Record<string,Administration>={
  jiankang:record('扬州','丹阳郡','建康县','danyang',['qi14','liang3'],'earlier-source','梁代仍见丹阳尹；县表以南齐基底校读，546 年完整辖境待复原。'),
  changan:record('雍州','京兆郡','长安县','jingzhao',['weiDown'],'earlier-source','京兆八县据《魏书》；不能把其中较早的郡治记载直接当作西魏都城布置。'),
  ye:record('司州','魏尹','邺县','weiyin',['weiUp'],'period-source','东魏天平迁都后，相州改司州、魏郡改魏尹；不是后来的北齐开局。'),
  jinyang:record('并州','太原郡','晋阳县','taiyuan',['weiUp'],'period-source','《魏书》记武定初置晋阳宫。'),
  jingkou:record('南徐州','南东海郡','丹徒县','nandonghai',['qi14','liang3'],'earlier-source','京口为城镇称呼；南东海包含侨县，不能将整张县表画成实土。'),
  guangling:record('南兖州','广陵郡','广陵县','guangling',['qi14','liang3'],'earlier-source','隶属关系据南齐基底与梁代南兖州记载；侨实边界待核。'),
  wujun:record('扬州','吴郡','吴县','wujun',['qi14'],'earlier-source','地图以吴县表示郡治城市；不把郡名直接当作县名。梁代增析县另待补齐。'),
  kuaiji:record('东扬州','会稽郡','山阴县','kuaiji',['qi14','liang3'],'earlier-source','梁普通五年复置东扬州；此时不能使用后出的会稽县代替山阴县。'),
  jiangling:record('荆州','南郡','江陵县','nanjun',['qi15','liang3'],'earlier-source','南郡县表据南齐资料，梁代细部沿革待核。'),
};
export const countyGroups={
  danyang:['建康','秣陵','丹阳','溧阳','永世','湖熟','江宁','句容'],
  jingzhao:['长安','杜','鄠','山北','新丰','霸城','阴槃','蓝田'],
  weiyin:['邺','临漳','繁阳','列人','昌乐','武安','临水','魏','平邑','易阳','元城','斥章','贵乡'],
  taiyuan:['晋阳','祁','榆次','中都','邬','平遥','沾','受阳','长安','阳邑'],
  nanjun:['江陵','华容','枝江','临沮','编','当阳'],
} as const;
// New county seats use approximate map anchors, not claimed archaeological coordinates.
export const countySeats:[string,string,number,number,'jiankang'|'changan'|'ye'][]=[
  ['moling','秣陵',118.85,31.84,'jiankang'],['danyang','丹阳',118.75,31.56,'jiankang'],
  ['liyang','溧阳',119.48,31.43,'jiankang'],['yongshi','永世',119.45,31.25,'jiankang'],
  ['hushu','湖熟',118.97,31.73,'jiankang'],['jiangning','江宁',118.60,31.86,'jiankang'],['jurong','句容',119.17,31.95,'jiankang'],
  ['duxian','杜县',108.99,34.15,'changan'],['huxian','鄠县',108.61,34.11,'changan'],
  ['shanbei','山北',109.10,34.17,'changan'],['xinfeng','新丰',109.26,34.43,'changan'],
  ['bacheng','霸城',109.07,34.32,'changan'],['yinpan','阴槃',109.34,34.46,'changan'],['lantian','蓝田',109.32,34.15,'changan'],
  ['linzhang','临漳',114.62,36.35,'ye'],['wuan','武安',114.20,36.70,'ye'],
  ['weixian','魏县',114.94,36.36,'ye'],['fanyang','繁阳',114.54,35.95,'ye'],['yuancheng','元城',115.15,36.29,'ye'],
];
for(const [id,name,,,parent] of countySeats){
  administration[id]={...administration[parent],county:name.endsWith('县')?name:name+'县',note:administration[parent].note+' 城址位置约略，县界为示意。'};
}
export function administrationPath(id:string){const a=administration[id];return a?`${a.province} / ${a.prefecture} / ${a.county}`:'州郡县归属待核';}
