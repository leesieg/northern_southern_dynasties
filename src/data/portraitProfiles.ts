import type { FacialGene,Genome } from '../core/genetics';
export interface PortraitProfile {maturity:number;beard:'none'|'short'|'long';headwear?:'tall-cap';features:Partial<Record<FacialGene,number>>;basis:'text'|'image'|'interpretation';source?:string;note:string}
/** Numerical proportions, age treatment and unspecified details are original art decisions, never measurements. */
export const portraitProfiles:Record<string,PortraitProfile>={
 'xiao-yan':{maturity:.78,beard:'long',headwear:'tall-cap',features:{faceLength:65,jaw:26,eyeWidth:25,eyeTilt:60,brow:20,noseLength:67,mouth:28,ears:60},basis:'image',source:'https://digitalarchive.npm.gov.tw/Collection/Detail/15644?dep=P',note:'参照故宫《历代帝王半身像·梁武帝》公开图中的高黑冠、收窄下颌、细长眉眼、细髭与垂须；转化为正面五官参数而非复制画面。传世帝王像不等于同时代写生，其年代未据此目录确定。'},
 'xiao-gang':{maturity:.48,beard:'short',features:{faceLength:56,jaw:35,eyeWidth:64,brow:35,noseLength:48,mouth:51},basis:'interpretation',note:'未核得可靠肖像，采用文士造型；五官数值为美术设定。'},
 'xiao-yi':{maturity:.46,beard:'long',features:{faceLength:72,jaw:25,eyeWidth:40,eyeTilt:62,brow:57,noseLength:66,mouth:32},basis:'interpretation',note:'未核得可靠肖像；未凭无出处的现代绘图确定眼疾侧别。'},
 'yuan-shanjian':{maturity:.18,beard:'none',features:{faceLength:52,jaw:23,eyeWidth:68,eyeSpacing:62,brow:30,noseWidth:29,mouth:60},basis:'interpretation',note:'年轻君主的原创组合，非历史容貌复原。'},
 'gao-huan':{maturity:.67,beard:'short',features:{faceLength:90,cheek:90,jaw:63,eyeWidth:57,eyeTilt:68,brow:81,noseLength:74,mouth:40},basis:'text',source:'https://zh.wikisource.org/wiki/北齊書_(四庫全書本)/卷01',note:'据长头、高颧及目有精光的文字描述设置长脸、高颧与有神眼形；其余是美术设定。'},
 'gao-cheng':{maturity:.25,beard:'none',features:{faceLength:65,cheek:74,jaw:53,eyeWidth:70,eyeTilt:62,brow:68,mouth:62},basis:'interpretation',note:'同族轮廓相近，五官和须发独立；不声称真实遗传关系可推出容貌。'},
 'gao-yang':{maturity:.22,beard:'short',features:{faceLength:38,jaw:78,eyeWidth:35,eyeTilt:80,brow:84,noseWidth:69,mouth:28},basis:'interpretation',note:'采用鲜明短阔轮廓以提高辨识，五官数值为美术设定。'},
 'yuan-baoju':{maturity:.49,beard:'short',features:{faceLength:40,jaw:80,cheek:30,eyeWidth:45,brow:60,noseWidth:72,mouth:69},basis:'interpretation',note:'宽面君主的原创组合，非历史容貌复原。'},
 'yuan-qin':{maturity:.19,beard:'none',features:{faceLength:48,jaw:60,eyeWidth:64,eyeSpacing:55,brow:43,noseWidth:57,mouth:51},basis:'interpretation',note:'年轻宗室的原创组合，非历史容貌复原。'},
 'yuwen-tai':{maturity:.59,beard:'long',features:{faceLength:62,jaw:95,cheek:67,eyeWidth:42,eyeTilt:66,brow:88,noseLength:68,noseWidth:65,ears:73},basis:'text',source:'https://www.shidianguji.com/zh/mid-page/7340117727119671306',note:'据方颡广额、美须髯的描述设计方阔额面与长须；神异描写不作生理事实。'},
 'dugu-xin':{maturity:.51,beard:'short',features:{faceLength:63,jaw:42,cheek:53,eyeWidth:72,eyeTilt:59,brow:66,noseLength:67,noseWidth:34,mouth:48},basis:'text',source:'https://zh.wikisource.org/zh/周書/卷16',note:'美容仪是笼统文字描述，仅用作整体仪容方向，不能据此断定具体五官。'},
};
export function applyPortraitProfile(genome:Genome,id:string):Genome {
 const result=structuredClone(genome),profile=portraitProfiles[id];if(!profile||!result.facial)return result;
 for(const [key,value] of Object.entries(profile.features))result.facial[key as FacialGene]=[Math.max(0,value-7),Math.min(100,value+7)];
 return result;
}
