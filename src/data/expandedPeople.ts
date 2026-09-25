import {countyOfficials} from './localOfficials';
/** 546 roster enrichment. Residences, traits and abilities are scenario choices;
 * unknown birthdays are estimates. Later offices/empires are not backdated. */
export interface ExpandedPerson {id:string;name:string;realm:'liang'|'east'|'west';family:string;home:string;birth:number;sex:'male'|'female';role:'commander'|'scholar'|'prince';source:{title:string;url:string};note:string;fictional?:boolean}
type Row=[string,string,ExpandedPerson['realm'],string,string,number,ExpandedPerson['role'],string,number];
const rows:Row[]=[
 ['xiao-lun','萧纶','liang','xiao','jiankang',507,'prince','梁書',29],
 ['xiao-ji','萧纪','liang','xiao','chengdu',508,'prince','梁書',55],
 ['xiao-cha','萧詧','liang','xiao','xiangyang',519,'prince','周書',48],
 ['xiao-yu','萧誉','liang','xiao','changsha',519,'prince','梁書',55],
 ['xiao-daqi','萧大器','liang','xiao','jiankang',524,'prince','梁書',44],
 ['he-jingrong','何敬容','liang','he-lujiang','jiankang',489,'scholar','梁書',37],
 ['zhu-yi','朱异','liang','zhu-wujun','jiankang',483,'scholar','梁書',38],
 ['yang-kan','羊侃','liang','yang-taishan','jiankang',495,'commander','梁書',39],
 ['yang-kun','羊鵾','liang','yang-taishan','jiankang',525,'commander','梁書',39],
 ['wei-can','韦粲','liang','wei-jingzhao','jiankang',495,'commander','梁書',43],
 ['wang-sengbian','王僧辩','liang','wang-taiyuan','xunyang',505,'commander','梁書',45],
 ['wang-lin','王琳','liang','wang-kuaiji','xunyang',526,'commander','陳書',31],
 ['xu-chi','徐摛','liang','xu-donghai','jiankang',474,'scholar','梁書',30],
 ['xu-ling','徐陵','liang','xu-donghai','jiankang',507,'scholar','陳書',26],
 ['yu-jianwu','庾肩吾','liang','yu-xinye','jiankang',487,'scholar','梁書',49],
 ['yu-xin','庾信','liang','yu-xinye','jiankang',513,'scholar','周書',41],
 ['chen-daotan','陈道谭','liang','chen-yingchuan','jiankang',500,'commander','陳書',3],
 ['chen-qian','陈蒨','liang','chen-yingchuan','wucheng',522,'commander','陳書',3],
 ['hulu-jin','斛律金','east','hulu','jinyang',488,'commander','北齊書',17],
 ['hulu-guang','斛律光','east','hulu','jinyang',515,'commander','北齊書',17],
 ['hulu-xian','斛律羡','east','hulu','jinyang',520,'commander','北齊書',17],
 ['duan-shao','段韶','east','duan-wuwei','jinyang',509,'commander','北齊書',16],
 ['gao-yue','高岳','east','gao','ye',512,'commander','北齊書',13],
 ['gao-longzhi','高隆之','east','gao-longzhi-house','ye',494,'scholar','北齊書',18],
 ['sun-teng','孙腾','east','sun-xianwu','ye',481,'scholar','北齊書',18],
 ['murong-shaozong','慕容绍宗','east','murong','ye',501,'commander','北齊書',20],
 ['peng-le','彭乐','east','peng-anding','jinyang',499,'commander','北齊書',15],
 ['hou-jing','侯景','east','hou-shuofang','yingchuan',503,'commander','梁書',56],
 ['cui-ling','崔㥄','east','cui-qinghe','ye',492,'scholar','北齊書',23],
 ['cui-zhan','崔瞻','east','cui-qinghe','dongwucheng',519,'scholar','北齊書',23],
 ['cui-jishu','崔季舒','east','cui-boling','ye',500,'scholar','北齊書',32],
 ['yang-yin','杨愔','east','yang-hongnong','ye',511,'scholar','北齊書',34],
 ['wei-shou','魏收','east','wei-julu','ye',507,'scholar','北齊書',37],
 ['gao-yan','高演','east','gao','ye',535,'prince','北齊書',6],
 ['gao-zhan','高湛','east','gao','ye',537,'prince','北齊書',7],
 ['li-bi','李弼','west','li-liaodong','changan',494,'commander','周書',15],
 ['yu-jin','于谨','west','yu-henan','changan',493,'commander','周書',15],
 ['yu-shi','于寔','west','yu-henan','changan',518,'commander','周書',15],
 ['zhao-gui','赵贵','west','zhao-tianshui','changan',500,'commander','周書',16],
 ['houmochen-chong','侯莫陈崇','west','houmochen','changan',514,'commander','周書',16],
 ['li-hu','李虎','west','li-longxi','changan',500,'commander','周書',16],
 ['li-bing','李昞','west','li-longxi','changan',514,'commander','舊唐書',1],
 ['su-chuo','苏绰','west','su-wugong','changan',498,'scholar','周書',23],
 ['su-wei','苏威','west','su-wugong','changan',542,'scholar','隋書',41],
 ['wei-xiaokuan','韦孝宽','west','wei-jingzhao','yubi',509,'commander','周書',31],
 ['wei-xiong','韦敻','west','wei-jingzhao','changan',502,'scholar','周書',31],
 ['yang-zhong','杨忠','west','yang-hongnong','changan',507,'commander','周書',19],
 ['yang-jian','杨坚','west','yang-hongnong','changan',541,'prince','隋書',1],
 ['yuwen-yu','宇文毓','west','yuwen','changan',534,'prince','周書',4],
 ['yuwen-yong','宇文邕','west','yuwen','changan',543,'prince','周書',5],
];
export const expandedPeople:ExpandedPerson[]=rows.map(([id,name,realm,family,home,birth,role,book,volume])=>({id,name,realm,family,home,birth,role,sex:'male',source:{title:`《${book}》卷${volume}`,url:`https://zh.wikisource.org/wiki/${book}/卷${String(volume).padStart(2,'0')}`},note:546-birth<16?'年少族人，尚未出仕。':role==='commander'?'军旅出身，效力于本国。':role==='prince'?'宗室成员，参与本国政务。':'文士出身，熟悉朝廷与地方事务。'}));
expandedPeople.push({id:'dugu-jialuo',name:'独孤伽罗',realm:'west',family:'dugu',home:'tianshui',birth:544,role:'prince',sex:'female',source:{title:'《隋书》卷三十六',url:'https://zh.wikisource.org/wiki/隋書/卷36'},note:'独孤信之女，546 年尚幼；不前置与杨坚的婚姻。'});
for(const [id,name,realm,home,family,birth] of [
 ['guest-liang-clerk','沈砚','liang','wucheng','fictional-shen',520],['guest-liang-engineer','沈衡','liang','wucheng','fictional-shen',499],
 ['guest-east-clerk','韩朔','east','xindu','fictional-han',521],['guest-east-elder','韩岑','east','xindu','fictional-han',496],
 ['guest-west-clerk','陆峤','west','anding','fictional-lu',520],['guest-west-elder','陆恪','west','anding','fictional-lu',494],
] as const)expandedPeople.push({id,name,realm,home,family,birth,role:'scholar',sex:'male',fictional:true,note:'架空地方士人；独立家系，不属于同姓历史名门。',source:{title:'剧本架空家系',url:''}});
expandedPeople.push(...countyOfficials);
export const expandedPersonById:Record<string,ExpandedPerson>=Object.fromEntries(expandedPeople.map(p=>[p.id,p]));
// Each edge has its own source; common surnames never imply a blood relationship.
export const expandedParentPairs:[string,string,string,number][]=[
 ['xiao-yan','xiao-lun','梁書',29],['xiao-yan','xiao-ji','梁書',55],['xiao-yan','xiao-tong','梁書',8],
 ['xiao-tong','xiao-cha','周書',48],['xiao-tong','xiao-yu','梁書',55],['xiao-gang','xiao-daqi','梁書',44],
 ['gao-huan','gao-yan','北齊書',6],['gao-huan','gao-zhan','北齊書',7],
 ['hulu-jin','hulu-guang','北齊書',17],['hulu-jin','hulu-xian','北齊書',17],
 ['xu-chi','xu-ling','陳書',26],
 ['yu-jianwu','yu-xin','周書',41],['yang-kan','yang-kun','梁書',39],
 ['wei-rui','wei-fang','梁書',28],['wei-fang','wei-can','梁書',43],
 ['wang-shennian','wang-sengbian','梁書',45],['chen-daotan','chen-qian','陳書',3],
 ['li-hu','li-bing','舊唐書',1],['su-chuo','su-wei','隋書',41],['yu-jin','yu-shi','周書',15],
 ['yang-zhong','yang-jian','隋書',1],['yuwen-tai','yuwen-yu','周書',4],['yuwen-tai','yuwen-yong','周書',5],
 ['wei-xu','wei-xiong','周書',31],['wei-xu','wei-xiaokuan','周書',31],['duan-rong','duan-shao','北齊書',16],['yang-jin','yang-yin','北齊書',34],
 ['yuwen-tai','yuwen-jue','周書',3],['xiao-yi','xiao-fangzhi','梁書',6],['yuan-baoju','yuan-kuo','北史',5],
 ['dugu-xin','dugu-jialuo','隋書',36],
 ['guest-liang-engineer','guest-liang-clerk','',0],['guest-east-elder','guest-east-clerk','',0],['guest-west-elder','guest-west-clerk','',0],
];
export const expandedAncestors=[
 {id:'wei-xu',name:'韦旭',family:'wei-jingzhao',book:'周書',volume:31},
 {id:'duan-rong',name:'段荣',family:'duan-wuwei',book:'北齊書',volume:16},
 {id:'yang-jin',name:'杨津',family:'yang-hongnong',book:'北齊書',volume:34},
 {id:'xiao-tong',name:'萧统',family:'xiao',book:'梁書',volume:8},
 {id:'wei-rui',name:'韦叡',family:'wei-jingzhao',book:'梁書',volume:12},
 {id:'wei-fang',name:'韦放',family:'wei-jingzhao',book:'梁書',volume:28},
 {id:'wang-shennian',name:'王神念',family:'wang-taiyuan',book:'梁書',volume:39},
];

const biographies:Record<string,string>={
 'xiao-lun':'萧衍第六子，封邵陵王。','xiao-ji':'萧衍第八子，封武陵王，经营蜀地。','xiao-cha':'萧统之子，封岳阳王，出镇襄阳。','xiao-yu':'萧统之子，封河东王。','xiao-daqi':'皇太子萧纲长子，封宣城王。',
 'he-jingrong':'梁廷旧臣，曾任尚书仆射。','zhu-yi':'梁廷近臣，参与机务与文书。','yang-kan':'泰山梁甫人，南归梁朝的将领。','yang-kun':'羊侃之子，出身将门。','wei-can':'韦叡之孙、韦放之子，梁将。','wang-sengbian':'王神念之子，效力于湘东王。','wang-lin':'会稽山阴人，效力于湘东王。',
 'xu-chi':'徐陵之父，梁东宫文士。','xu-ling':'徐摛之子，梁东宫文士。','yu-jianwu':'南阳新野人，庾信之父。','yu-xin':'庾肩吾之子，梁东宫文士，此时尚未北迁。','chen-qian':'陈道谭之子，陈霸先之侄。','chen-daotan':'陈霸先之兄，梁将。',
 'hulu-jin':'北镇出身，追随高欢的将领。','hulu-guang':'斛律金之子，善骑射。','hulu-xian':'斛律金之子，斛律光之弟。','duan-shao':'段荣之子，追随高欢。','gao-yue':'高欢宗亲，东魏将领。','gao-longzhi':'东魏重臣；与高欢的同姓不作为直系血缘依据。','sun-teng':'东魏重臣，参与朝廷事务。','murong-shaozong':'燕郡人，东魏将领。','peng-le':'东魏将领，以勇力见称。','hou-jing':'东魏将领，此时尚未叛魏投梁。','cui-jishu':'博陵崔氏文臣。','cui-ling':'崔休之子，清河东武城人。','cui-zhan':'崔㥄之子，清河崔氏族人。','yang-yin':'弘农华阴人，东魏文臣。','wei-shou':'巨鹿下曲阳人，东魏文士。',
 'li-bi':'辽东襄平人，西魏将领。','yu-jin':'河南洛阳人，西魏将领。','yu-shi':'于谨之子，西魏将领。','zhao-gui':'天水南安人，西魏将领。','houmochen-chong':'代武川人，西魏将领。','li-hu':'西魏将领，李昞之父。','li-bing':'李虎之子，此时尚未建立唐朝。','su-chuo':'武功人，参与西魏行政与财政整顿。','wei-xiaokuan':'京兆杜陵人，镇守玉壁。','wei-xiong':'京兆杜陵人，韦孝宽之兄。','yang-zhong':'西魏将领，杨坚之父。',
};
for(const p of expandedPeople)if(biographies[p.id])p.note=biographies[p.id];
