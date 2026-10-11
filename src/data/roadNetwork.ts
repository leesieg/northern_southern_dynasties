import type {Road} from '../core/types';
/** Reviewed transport corridors between modeled sites, not an exhaustive 546 road atlas.
 * `via` is a chosen playable corridor, not a claim that all historical travelers took it.
 * Evidence and the retained/uncertain edges are recorded in 城址位置与地形核验.md. */
export const roadRevisions:{from:string;to:string;via:string[];factor:number;reason:string}[]=[
 {from:'ye',to:'jinyang',via:['linshui','wuan'],factor:1.6,reason:'并邺通道经滏口；临水与武安接入干线，古壶关口不冒充现有壶关县治。'},
 {from:'ye',to:'wuan',via:['linshui'],factor:1,reason:'临水在所选滏口通道的东段，不能保留绕过它的平行捷径。'},
 {from:'ye',to:'jicheng',via:['yiyang-weiyin','zhongshan','zhuoxian'],factor:1.2,reason:'河北平原北上通道经沿线现有节点；邺与蓟不再视为一段接壤。'},
 {from:'ye',to:'qingzhou',via:['weixian','jibei','lixia'],factor:1.2,reason:'河北至齐地通道接入魏县、济北、历城，不跳过沿途控制。'},
 {from:'qingzhou',to:'jibei',via:['lixia'],factor:1,reason:'青州往济北的所选通道经过历城，消除逆向绕城边。'},
 {from:'luoyang',to:'ye',via:['jixian'],factor:1.2,reason:'河洛至邺的东北通道接入汲郡节点；渡口未作为独立城市建模。'},
 {from:'luoyang',to:'pengcheng',via:['chenliu'],factor:1.2,reason:'河洛向东接入浚仪，再沿汴泗方向到彭城；不套用隋代通济渠。'},
 {from:'changan',to:'tianshui',via:['yongxian'],factor:1.4,reason:'关陇西向通道接入雍县，保留陇山过山段。'},
 {from:'changan',to:'puzhou',via:['fengyi'],factor:1.2,reason:'渭北经冯翊至蒲津渡方向，不跨过冯翊直达蒲坂。'},
 {from:'changan',to:'huayin',via:['bacheng','xinfeng'],factor:1.2,reason:'渭南东行通道接入霸城、新丰，再到华阴；与渭北蒲津路线分开。'},
 {from:'changan',to:'xinfeng',via:['bacheng'],factor:1,reason:'东行接入霸城，避免原县治支线形成绕城捷径。'},
 {from:'changan',to:'yinpan',via:['bacheng'],factor:1,reason:'阴槃作为霸城以东支路；县治定位仍按已有资料边界处理。'},
 {from:'hanzhong',to:'changan',via:['huxian'],factor:1.8,reason:'采用傥骆方向过秦岭、经鄠县进入长安；未把褒斜与子午诸路视为同一条直线。'},
 {from:'xiangyang',to:'hanzhong',via:['nanxiang'],factor:1.6,reason:'沿汉水入汉中盆地前先经已建模南乡，不跳过汉中东口。'},
 {from:'chengdu',to:'hanzhong',via:['fuxian'],factor:1.7,reason:'金牛道方向从成都先经涪县再北上；剑门、葭萌等缺失节点仍待补。'},
 {from:'jiangling',to:'bajun',via:['zhijiang','yiling','yufu'],factor:1.5,reason:'上溯长江接入枝江、夷陵、鱼复；不得跳过三峡门户。'},
 {from:'xunyang',to:'jiangling',via:['jiangxia','baling'],factor:1.2,reason:'所选长江通道经沙羡、巴陵至江陵，取消内陆直切。'},
 {from:'jiangling',to:'changsha',via:['baling'],factor:1.2,reason:'经洞庭出口巴陵转湘江方向，不让长沙直接与江陵接壤。'},
 {from:'changsha',to:'guangzhou',via:['guiyang','shixing'],factor:1.5,reason:'采用郴县至曲江的湘粤通道；秦汉旧道与唐代扩建区别对待。'},
 {from:'wujun',to:'kuaiji',via:['qiantang'],factor:1.2,reason:'江南通道经钱唐渡浙江、接西兴方向入山阴；不是直跨钱塘江口。'},
];
const key=(a:string,b:string)=>[a,b].sort().join(':');
/** Preserve every old edge for booked journeys and traffic saves, but exclude it from new plans. */
export function reviseRoadNetwork(original:Road[]):Road[]{
 const retired=new Set(roadRevisions.map(r=>key(r.from,r.to))),roads=original.map(r=>retired.has(key(r.from,r.to))?{...r,legacyOnly:true}:r);
 const byKey=new Map(roads.map(r=>[key(r.from,r.to),r]));
 for(const revision of roadRevisions){
  const route=[revision.from,...revision.via,revision.to];
  for(let i=1;i<route.length;i++){
   const from=route[i-1],to=route[i],id=key(from,to),existing=byKey.get(id);
   if(existing){if(existing.legacyOnly)throw new Error('Revised route reuses retired edge: '+id);continue;}
   const road={from,to,factor:revision.factor};roads.push(road);byKey.set(id,road);
  }
 }
 return roads;
}
