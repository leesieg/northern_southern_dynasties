import {countyOfficials} from './localOfficials';
import {siteById} from './scenario';
import {expandedPeople,expandedAncestors,expandedParentPairs} from './expandedPeople';
import {relationshipPeople} from './relationships';
import { historicalCharacters,characterRelations } from './characters';
export interface FamilySource {title:string;url:string}
export interface Family {id:string;surname:string;name:string;origin:string;originKind:'郡望'|'族源'|'设定';color:string;note:string;sources:FamilySource[]}
const src=(title:string,path:string):FamilySource=>({title,url:'https://zh.wikisource.org/wiki/'+path});
const liang=src('《梁书》卷一','梁書/卷01'),dugu=src('《周书》卷十六','周書/卷16'),cui=src('《北齐书》卷二十三','北齊書/卷23');
const gao={title:'《北齐书》神武上',url:'https://www.shidianguji.com/book/SK0718/chapter/1l9yt87600nqf'},yuwen={title:'《周书》文帝上',url:'https://www.shidianguji.com/book/LS0012/chapter/LS0012_4'};
const wei22=src('《魏书》卷二十二','魏書/卷22'),wei12=src('《魏书》卷十二','魏書_(四庫全書本)/卷012'),bei5=src('《北史》卷五','北史/卷005'),tongjian=src('《资治通鉴》卷一百四十九','資治通鑑/卷149');
export const families:Family[]=[
 {id:'xiao',surname:'萧',name:'兰陵萧氏',origin:'兰陵；南迁后籍南兰陵中都里',originKind:'郡望',color:'#ae7556',note:'本支收录萧衍近祖及当前可玩子嗣。',sources:[liang]},
 {id:'gao',surname:'高',name:'渤海高氏',origin:'渤海蓨',originKind:'郡望',color:'#77949e',note:'依史书所载郡望展示，不对高氏族源争论作定论。',sources:[gao]},
 {id:'yuan',surname:'元',name:'河南元氏',origin:'代地南迁，洛阳籍',originKind:'族源',color:'#b99d61',note:'东、西魏皇族经元宏连接；同族不等于同一政权，也不自动获得跨政权继任资格。',sources:[src('《北史》卷三·迁洛籍贯','北史_(四庫全書本)/卷003')]},
 {id:'yuwen',surname:'宇文',name:'武川宇文氏',origin:'代武川',originKind:'族源',color:'#9b8876',note:'以本支籍贯标识，不将北镇族源称作汉族士族郡望。',sources:[yuwen]},
 {id:'dugu',surname:'独孤',name:'云中独孤氏',origin:'云中，后镇武川',originKind:'族源',color:'#839c82',note:'收录独孤信与父祖；未录子女不表示无后。',sources:[dugu]},
 {id:'cui-qinghe',surname:'崔',name:'清河崔氏',origin:'清河东武城',originKind:'郡望',color:'#7ea99e',note:'崔休为已故先人，崔㥄与崔瞻参与本局交往和任职；与博陵崔氏分别建模。',sources:[cui]},
 {id:'shen',surname:'沈',name:'江左沈氏',origin:'江左（玩法设定，非考据郡望）',originKind:'设定',color:'#b59c7a',note:'沈行舟是虚构人物，不挂接任何历史沈氏谱系。',sources:[]},
];
const extraHouses:[string,string,string,string,Family['originKind']][]=[
 ['chen-yingchuan','陈','颍川陈氏','颍川；吴兴长城','郡望'],['wei-jingzhao','韦','京兆韦氏','京兆杜陵','郡望'],
 ['wang-taiyuan','王','太原王氏','太原祁','郡望'],['wang-kuaiji','王','会稽王氏','会稽山阴','郡望'],
 ['wang-langya','王','琅邪王氏','琅邪临沂','郡望'],['xu-donghai','徐','东海徐氏','东海郯','郡望'],
 ['yu-xinye','庾','南阳庾氏','南阳新野','郡望'],['he-lujiang','何','庐江何氏','庐江灊','郡望'],
 ['zhu-wujun','朱','吴郡朱氏','吴郡钱唐','郡望'],['yang-taishan','羊','泰山羊氏','泰山梁甫','郡望'],
 ['hulu','斛律','北镇斛律氏','敕勒部；北镇','族源'],['duan-wuwei','段','武威段氏','武威姑臧','郡望'],
 ['gao-longzhi-house','高','广宁高氏','广宁；非高欢直系','族源'],['sun-xianwu','孙','咸武孙氏','咸武','族源'],
 ['murong','慕容','燕郡慕容氏','燕郡','族源'],['peng-anding','彭','安定彭氏','安定','郡望'],
 ['hou-shuofang','侯','朔方侯氏','朔方','族源'],['cui-boling','崔','博陵崔氏','博陵安平','郡望'],
 ['yang-hongnong','杨','弘农杨氏','弘农华阴；不同支系不强接血缘','郡望'],['wei-julu','魏','巨鹿魏氏','巨鹿下曲阳','郡望'],
 ['li-liaodong','李','辽东李氏','辽东襄平','郡望'],['li-longxi','李','陇西李氏','史书所述陇西成纪郡望','郡望'],
 ['yu-henan','于','河南于氏','河南洛阳','族源'],['zhao-tianshui','赵','天水赵氏','天水南安','郡望'],
 ['houmochen','侯莫陈','武川侯莫陈氏','代武川','族源'],['su-wugong','苏','武功苏氏','武功','郡望'],
 ['lou-daijun','娄','代郡娄氏','代郡平城','族源'],
 ['fictional-shen','沈','吴兴沈氏别支','吴兴（架空）','设定'],['fictional-han','韩','信都韩氏别支','信都（架空）','设定'],['fictional-lu','陆','安定陆氏别支','安定（架空）','设定'],
 ['fictional-house-liang','顾','建康顾氏','建康（架空）','设定'],['fictional-house-east','韩','邺城韩氏','邺城（架空）','设定'],['fictional-house-west','陆','长安陆氏','长安（架空）','设定'],
];
for(const [id,surname,name,origin,originKind] of extraHouses)families.push({id,surname,name,origin,originKind,color:originKind==='设定'?'#9b8876':'#7ea99e',note:originKind==='设定'?'架空独立家系，不挂接历史谱系。':'仅连接已录史料可证的亲属，不推定同姓者的世系。',sources:[...new Map(relationshipPeople.filter(p=>p.family===id&&p.source).map(p=>[p.source!.url,p.source!])).values()]});
for(const p of countyOfficials)families.push({id:p.family,surname:p.name[0],name:siteById[p.home].name+p.name[0]+'氏',origin:siteById[p.home].name,originKind:'设定',color:'#9b8876',note:'架空县官家系，不接入同姓历史名门。',sources:[]});
export const familyById:Record<string,Family>=Object.fromEntries(families.map(f=>[f.id,f]));
export interface FamilyPerson {id:string;name:string;family:string;status:'ancestor'|'roster'|'reference'|'fictional';description:string;sources:FamilySource[]}
const ancestor=(id:string,name:string,family:string,source:FamilySource):FamilyPerson=>({id,name,family,status:'ancestor',description:'546 年开局前的先人，仅用于追溯家谱，不参与本局行动。',sources:[source]});
export const familyPeople:FamilyPerson[]=[
 ...historicalCharacters.map(c=>({id:c.id,name:c.name,family:c.family,status:'roster' as const,description:c.title,sources:c.sources})),
 {id:'fictional',name:'沈行舟',family:'shen',status:'fictional',description:'虚构开局人物，家世未设定。',sources:[]},
 ancestor('xiao-daoci','萧道赐','xiao',liang),ancestor('xiao-shunzhi','萧顺之','xiao',liang),
 ancestor('gao-mi','高谧','gao',gao),ancestor('gao-shu','高树','gao',gao),
 ancestor('yuwen-tao','宇文韬','yuwen',yuwen),ancestor('yuwen-gong','宇文肱','yuwen',yuwen),
 ancestor('dugu-sini','独孤俟尼','dugu',dugu),ancestor('dugu-kuzhe','独孤库者','dugu',dugu),
 ancestor('yuan-hong','元宏','yuan',wei22),ancestor('yuan-yi','元怿','yuan',wei22),ancestor('yuan-dan','元亶','yuan',wei12),ancestor('yuan-yu','元愉','yuan',bei5),
 ancestor('cui-xiu','崔休','cui-qinghe',cui),
 {id:'cui-ling',name:'崔㥄',family:'cui-qinghe',status:'reference',description:'字长孺，清河东武城人。家谱资料人物，暂未接入官职、交往与威望模拟。',sources:[cui]},
 {id:'cui-zhan',name:'崔瞻',family:'cui-qinghe',status:'reference',description:'字彦通，崔㥄之子。家谱资料人物，暂未接入官职、交往与威望模拟。',sources:[cui]},
];
for(const p of relationshipPeople)if(!familyPeople.some(f=>f.id===p.id))familyPeople.push({id:p.id,name:p.name,family:p.family,status:p.status==='fictional'?'fictional':'roster',description:p.note,sources:p.source?[p.source]:[]});
for(const p of familyPeople)if(expandedPeople.some(e=>e.id===p.id)){p.status=expandedPeople.find(e=>e.id===p.id)!.fictional?'fictional':'roster';p.description=expandedPeople.find(e=>e.id===p.id)!.note;}
for(const p of expandedAncestors)familyPeople.push(ancestor(p.id,p.name,p.family,src(`《${p.book}》卷${p.volume}`,p.book+'/卷'+String(p.volume).padStart(2,'0'))));
export const familyPersonById:Record<string,FamilyPerson>=Object.fromEntries(familyPeople.map(p=>[p.id,p]));
export interface ParentLink {parent:string;child:string;kind:'父亲'|'母亲';source:FamilySource}
const link=(parent:string,child:string,source:FamilySource):ParentLink=>({parent,child,kind:'父亲',source});
export const parentLinks:ParentLink[]=[
 ...characterRelations.filter(r=>r.kind==='父子').map(r=>link(r.from,r.to,r.source)),
 link('xiao-daoci','xiao-shunzhi',liang),link('xiao-shunzhi','xiao-yan',liang),
 link('gao-mi','gao-shu',gao),link('gao-shu','gao-huan',gao),
 link('yuwen-tao','yuwen-gong',yuwen),link('yuwen-gong','yuwen-tai',yuwen),
 link('dugu-sini','dugu-kuzhe',dugu),link('dugu-kuzhe','dugu-xin',dugu),
 link('yuan-hong','yuan-yi',wei22),link('yuan-hong','yuan-yu',wei22),link('yuan-yi','yuan-dan',tongjian),link('yuan-dan','yuan-shanjian',wei12),link('yuan-yu','yuan-baoju',bei5),
 link('cui-xiu','cui-ling',cui),link('cui-ling','cui-zhan',cui),
];
for(const [parent,child,book,volume] of expandedParentPairs)parentLinks.push(link(parent,child,book?src(`《${book}》卷${volume}`,book+'/卷'+String(volume).padStart(2,'0')):{title:'架空家系',url:''}));
parentLinks.push({parent:'lou-zhaojun',child:'gao-cheng',kind:'母亲',source:src('《北齐书》卷九','北齊書/卷09')},{parent:'lou-zhaojun',child:'gao-yang',kind:'母亲',source:src('《北齐书》卷九','北齊書/卷09')});
const membersByFamily:Record<string,FamilyPerson[]>=Object.fromEntries(families.map(f=>[f.id,familyPeople.filter(p=>p.family===f.id)]));
export const familyMembers=(id:string)=>membersByFamily[id]??[];
export function relatives(id:string,direction:'ancestors'|'descendants'){
 const seen=new Set([id]),result:FamilyPerson[]=[],queue=[id];
 for(let i=0;i<queue.length;i++)for(const r of parentLinks){const next=direction==='ancestors'?(r.child===queue[i]?r.parent:null):(r.parent===queue[i]?r.child:null);if(next&&!seen.has(next)){seen.add(next);queue.push(next);result.push(familyPersonById[next]);}}
 return result;
}
