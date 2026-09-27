import {expandedSeats} from './expandedGeography.ts';
import { countySeats } from './administration.ts';
import type { Polity, Road, Site } from '../core/types';

export const CONTENT_VERSION = '546-map-0.3';
export const polities: Record<Polity, { name: string; color: string; short: string }> = {
  liang: { name: '梁', color: '#668b7b', short: '江左' },
  east: { name: '东魏', color: '#8e778f', short: '河北' },
  west: { name: '西魏', color: '#b69a68', short: '关陇' },
  frontier: { name: '周边地区', color: '#8a9184', short: '四境' },
};

// Spatial anchors and initial affiliations are a design dataset, not a reviewed 546 gazetteer.
export const sites: Site[] = [
  { id: 'jiankang', name: '建康', lon: 118.78, lat: 32.05, polity: 'liang', terrain: '丘陵', capital: true, description: '江水环流，舟楫往来。旅程从这座江南城邑开始。' },
  { id: 'jingkou', name: '京口', lon: 119.45, lat: 32.2, polity: 'liang', terrain: '河谷', description: '江岸渡口连接南北，道路沿水展开。' },
  { id: 'guangling', name: '广陵', lon: 119.42, lat: 32.4, polity: 'liang', terrain: '平原', description: '沿江与淮地之间的交通节点。' },
  { id: 'shouchun', name: '寿春', lon: 116.79, lat: 32.58, polity: 'liang', terrain: '平原', description: '淮水之滨，南北通道在此交汇。' },
  { id: 'hefei', name: '合肥', lon: 117.23, lat: 31.82, polity: 'liang', terrain: '丘陵', description: '连接江淮的内陆道路节点。' },
  { id: 'wujun', name: '吴县', lon: 120.59, lat: 31.3, polity: 'liang', terrain: '平原', description: '水网交织，东南旅途在此分岔。' },
  { id: 'kuaiji', name: '山阴', lon: 120.58, lat: 30.0, polity: 'liang', terrain: '丘陵', description: '江南山川之间的城邑。' },
  { id: 'xunyang', name: '寻阳', lon: 115.99, lat: 29.72, polity: 'liang', terrain: '河谷', description: '江湖相接，沿江远行的重要一站。' },
  { id: 'jiangling', name: '江陵', lon: 112.24, lat: 30.34, polity: 'liang', terrain: '平原', description: '江汉平原腹地，西行道路通往巴蜀。' },
  { id: 'xiangyang', name: '襄阳', lon: 112.14, lat: 32.04, polity: 'liang', terrain: '河谷', description: '汉水沿岸，通往中原与关中的要道。' },
  { id: 'changsha', name: '长沙', lon: 112.94, lat: 28.23, polity: 'liang', terrain: '丘陵', description: '循湘水而行，可向南抵达岭南。' },
  { id: 'nanchang', name: '南昌', lon: 115.86, lat: 28.68, polity: 'liang', terrain: '河谷', description: '赣水流域的一处旅行节点。' },
  { id: 'guangzhou', name: '广州', lon: 113.26, lat: 23.13, polity: 'liang', terrain: '河谷', description: '南海之滨，跨越山岭后的远行终点。' },
  { id: 'chengdu', name: '成都', lon: 104.07, lat: 30.67, polity: 'liang', terrain: '平原', description: '群山环抱的平原，蜀地道路的交汇处。' },
  { id: 'bajun', name: '巴郡', lon: 106.55, lat: 29.57, polity: 'liang', terrain: '山地', description: '江流穿山，蜀道与水路在此相连。' },
  { id: 'hanzhong', name: '汉中', lon: 107.02, lat: 33.07, polity: 'liang', terrain: '河谷', description: '秦岭以南的盆地，山道令旅程更为漫长。' },
  { id: 'changan', name: '长安', lon: 108.94, lat: 34.27, polity: 'west', terrain: '平原', capital: true, description: '关中平原腹地，向西可沿河陇远行。' },
  { id: 'tianshui', name: '天水', lon: 105.73, lat: 34.58, polity: 'west', terrain: '山地', description: '关陇之间，山地道路蜿蜒而行。' },
  { id: 'jincheng', name: '金城', lon: 103.83, lat: 36.06, polity: 'west', terrain: '河谷', description: '沿河谷可进入河西走廊。' },
  { id: 'wuwei', name: '武威', lon: 102.64, lat: 37.93, polity: 'west', terrain: '绿洲', description: '走廊中的绿洲，长途出行需备足行粮。' },
  { id: 'zhangye', name: '张掖', lon: 100.45, lat: 38.93, polity: 'west', terrain: '绿洲', description: '祁连山北，绿洲接续西行道路。' },
  { id: 'dunhuang', name: '敦煌', lon: 94.66, lat: 40.14, polity: 'west', terrain: '绿洲', description: '西行道路的门户，前路遥远。' },
  { id: 'luoyang', name: '洛阳', lon: 112.45, lat: 34.62, polity: 'east', terrain: '河谷', description: '河洛之间，通往邺城与关中的道路相接。' },
  { id: 'ye', name: '邺城', lon: 114.61, lat: 36.28, polity: 'east', terrain: '平原', capital: true, description: '河北平原上的都城，南北道路在此汇聚。' },
  { id: 'jinyang', name: '晋阳', lon: 112.48, lat: 37.77, polity: 'east', terrain: '河谷', description: '汾水谷地，山地将平原分隔开来。' },
  { id: 'pingcheng', name: '平城', lon: 113.3, lat: 40.09, polity: 'east', terrain: '山地', description: '北地城邑，山口连接塞外与河东。' },
  { id: 'jicheng', name: '蓟城', lon: 116.35, lat: 39.9, polity: 'east', terrain: '平原', description: '北方道路的节点，东向可通辽地。' },
  { id: 'qingzhou', name: '青州', lon: 118.48, lat: 36.7, polity: 'east', terrain: '丘陵', description: '山海之间，东部道路向此延伸。' },
  { id: 'pengcheng', name: '彭城', lon: 117.18, lat: 34.26, polity: 'east', terrain: '平原', description: '泗水附近，江淮通往中原的节点。' },
  { id: 'gaochang', name: '高昌', lon: 89.53, lat: 42.85, polity: 'frontier', terrain: '绿洲', description: '西域绿洲。' },
  { id: 'qiuci', name: '龟兹', lon: 82.97, lat: 41.72, polity: 'frontier', terrain: '绿洲', description: '天山南侧的绿洲，连接更西方的路途。' },
  { id: 'shule', name: '疏勒', lon: 75.99, lat: 39.47, polity: 'frontier', terrain: '绿洲', description: '西部绿洲，沿道路与东方相连。' },
  { id: 'liaodong', name: '辽东', lon: 123.17, lat: 41.27, polity: 'frontier', terrain: '平原', description: '东北边地。' },
  { id: 'ningzhou', name: '宁州', lon: 103.8, lat: 25.5, polity: 'liang', terrain: '山地', description: '西南山地，山路行程较长。' },
];

const links: [string, string, number?][] = [
  ['jiankang','jingkou'],['jingkou','guangling'],['jiankang','hefei'],['hefei','shouchun'],
  ['guangling','shouchun'],['guangling','pengcheng'],['shouchun','pengcheng'],['jingkou','wujun'],
  ['wujun','kuaiji'],['jiankang','xunyang'],['xunyang','nanchang'],['xunyang','jiangling'],
  ['jiangling','xiangyang'],['jiangling','changsha'],['changsha','nanchang'],['changsha','guangzhou',1.5],
  ['kuaiji','nanchang',1.5],['jiangling','bajun',1.5],['bajun','chengdu',1.2],['chengdu','hanzhong',1.7],
  ['hanzhong','changan',1.8],['xiangyang','hanzhong',1.6],['xiangyang','luoyang',1.3],['xiangyang','liangxian',1.3],
  ['changan','luoyang',1.2],['changan','tianshui',1.4],['tianshui','jincheng',1.4],['jincheng','wuwei',1.3],
  ['wuwei','zhangye'],['zhangye','dunhuang'],['dunhuang','gaochang',1.3],['gaochang','qiuci',1.3],
  ['qiuci','shule',1.3],['luoyang','ye'],['luoyang','pengcheng'],['ye','qingzhou'],['pengcheng','qingzhou'],
  ['ye','jinyang',1.6],['jinyang','pingcheng',1.2],['jinyang','changan',1.5],['ye','jicheng'],
  ['jicheng','pingcheng',1.4],['jicheng','liaodong',1.3],['chengdu','ningzhou',1.7],['ningzhou','guangzhou',1.7],
];
for(const [id,name,lon,lat,parent] of countySeats){
  const center=sites.find(site=>site.id===parent)!;
  sites.push({id,name,lon,lat,polity:center.polity,terrain:center.terrain,rank:'county',description:'史籍记载的县治，城址位置约略。'});
  links.push([parent,id]);
}
for(const [id,name,lon,lat,connection,polity,terrain] of expandedSeats){
 sites.push({id,name,lon,lat,polity,terrain,rank:'county',description:'州郡县治与周边乡里，城址约略。'});
 links.push([connection,id]);
}
// Retain the old direct edge only to read journeys already saved on it. New routes pass through Liang County.
export const roads: Road[] = links.map(([from, to, factor = 1]) => ({from, to, factor,...(from==='xiangyang'&&to==='luoyang'?{legacyOnly:true}:{})}));
export const siteById = Object.fromEntries(sites.map(site => [site.id, site])) as Record<string, Site>;
