/** Cultural identity is a scenario interpretation, not ancestry, allegiance or a population census. */
export const cultureNames={han:'汉文化',xianbei:'鲜卑文化',gaoche:'敕勒文化',jie:'羯文化',unknown:'文化未详'} as const;
export type CultureId=keyof typeof cultureNames;
export const validCulture=(v:unknown):v is CultureId=>typeof v==='string'&&Object.hasOwn(cultureNames,v);
const group=(ids:string,culture:CultureId)=>Object.fromEntries(ids.split(' ').map(id=>[id,culture]));
/** Explicit IDs; neither surname nor current polity determines culture. */
export const personCultures:Record<string,CultureId>={
 ...group('xiao-yan xiao-gang xiao-yi xiao-lun xiao-ji xiao-cha xiao-yu xiao-daqi xiao-fangzhi he-jingrong zhu-yi yang-kan yang-kun wei-can wang-sengbian wang-lin xu-chi xu-ling yu-jianwu yu-xin chen-daotan chen-qian chen-baxian gao-longzhi sun-teng peng-le cui-ling cui-zhan cui-jishu yang-yin wei-shou li-bi zhao-gui li-hu li-bing su-chuo su-wei wei-xiaokuan wei-xiong yang-zhong yang-jian wang-lingbin xu-zhaopei fictional guest-liang guest-east guest-west guest-liang-clerk guest-liang-engineer guest-east-clerk guest-east-elder guest-west-clerk guest-west-elder','han'),
 ...group('dugu-xin dugu-jialuo yuwen-tai yuwen-hu yuwen-jue yuwen-yu yuwen-yong yuan-shanjian yuan-baoju yuan-qin yuan-kuo murong-shaozong houmochen-chong yu-jin yu-shi duan-shao lou-zhaojun gao-huan gao-cheng gao-yang gao-yue gao-yan gao-zhan','xianbei'),
 ...group('hulu-jin hulu-guang hulu-xian','gaoche'),
 'hou-jing':'unknown',
};
export const cultureSources={
 gao:{title:'《北齐书》卷一',url:'https://zh.wikisource.org/wiki/北齊書/卷1',note:'高欢家族累世北边、习俗同鲜卑；高氏标签表示剧本文化认同，不宣称血统。'},
 hulu:{title:'《北齐书》卷十七',url:'https://zh.wikisource.org/wiki/北齊書/卷17',note:'斛律金为敕勒部人，保留独立标签。'},
 hou:{title:'《梁书》卷五十六',url:'https://zh.wikisource.org/wiki/梁書/卷56',note:'本传未明确侯景族属，羯或鲜卑说有争议，首版保留未详。'},
 clothing:{title:'国博·鲜卑服武士陶俑',url:'https://www.chnmuseum.cn/zp/zpml/kgfjp/202111/t20211111_252111.shtml',note:'服饰为游戏美术概括；北朝汉式朝服与窄袖衣装并存，不是民族着装禁令。'},
};
export function defaultPersonCulture(id:string):CultureId {
 // Fictional county clerks and reserve scholars represent the agrarian administrative setting.
 if(id.startsWith('county-official-')||id.startsWith('office-reserve-'))return 'han';
 return Object.hasOwn(personCultures,id)?personCultures[id]:'unknown';
}
/** County seats model agrarian civic culture. No military minority percentages are invented.
 * Frontier coverage is unresolved. These defaults are game abstractions, not measured county data. */
export const defaultCountyCulture=(frontier:boolean):CultureId=>frontier?'unknown':'han';
