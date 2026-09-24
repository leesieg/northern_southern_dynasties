import {expandedPeople} from './expandedPeople';
/** Birth years only: no fictitious birthday or predetermined historical death date.
 * Unknown years are explicit game estimates, never historical claims. */
export interface BirthRecord {year:number;basis:'year'|'estimate'|'fictional';source?:string}
const liang='https://zh.wikisource.org/wiki/梁書/',qi='https://zh.wikisource.org/wiki/北齊書_(四庫全書本)/',zhou='https://zh.wikisource.org/wiki/周書/';
export const birthRecords:Record<string,BirthRecord>={
 'xiao-yan':{year:464,basis:'year',source:liang+'卷03'},
 'xiao-gang':{year:503,basis:'year',source:liang+'卷04'},
 'xiao-yi':{year:508,basis:'year',source:liang+'卷05'},
 'gao-huan':{year:496,basis:'year',source:qi+'卷02'},
 'gao-cheng':{year:521,basis:'year',source:qi+'卷03'},
 'gao-yang':{year:529,basis:'year',source:qi+'卷04'},
 'yuan-shanjian':{year:524,basis:'year',source:'https://zh.wikisource.org/wiki/魏書/卷12'},
 'yuan-baoju':{year:507,basis:'year',source:'https://zh.wikisource.org/wiki/北史/卷005'},
 'yuan-qin':{year:525,basis:'year',source:'https://zh.wikisource.org/wiki/北史/卷005'},
 'yuwen-tai':{year:507,basis:'estimate',source:zhou+'卷01'},
 'dugu-xin':{year:503,basis:'year',source:zhou+'卷16'},
 'chen-baxian':{year:503,basis:'year',source:'https://zh.wikisource.org/wiki/陳書/卷02'},
 'yuwen-hu':{year:513,basis:'year',source:zhou+'卷11'},
 'yuwen-jue':{year:542,basis:'year',source:zhou+'卷03'},
 'xiao-fangzhi':{year:543,basis:'year',source:liang+'卷06'},
 'yuan-kuo':{year:530,basis:'estimate'},
 'wang-lingbin':{year:505,basis:'year',source:'https://zh.wikisource.org/wiki/南史/卷12'},
 'xu-zhaopei':{year:500,basis:'estimate',source:liang+'卷07'},
 'lou-zhaojun':{year:501,basis:'year',source:qi+'卷09'},
 fictional:{year:522,basis:'fictional'},
 'guest-liang':{year:524,basis:'fictional'},'guest-east':{year:521,basis:'fictional'},'guest-west':{year:523,basis:'fictional'},
 merchant:{year:511,basis:'fictional'},messenger:{year:518,basis:'fictional'},traveler:{year:520,basis:'fictional'},
};

for(const p of expandedPeople)birthRecords[p.id]={year:p.birth,basis:p.fictional?'fictional':'estimate',source:p.source.url||undefined};
