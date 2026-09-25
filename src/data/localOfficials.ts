import {sites} from './scenario';
/** Fictional county incumbents fill gaps in the 546 evidence, never historical claims.
 * Stable IDs and independent households keep these people in the ordinary life,
 * kinship, portrait, salary and appointment systems. */
const seed=(id:string)=>[...id].reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,17);
export const countyOfficials=sites.filter(s=>s.polity!=='frontier').map(s=>{const i=seed(s.id);return ({
 id:'county-official-'+s.id,name:['陶','周','许','张','刘','郑','孙','顾','韩','陆','沈','冯'][i%12]+['文','季','仲','景','元','子','伯','思','德','令'][Math.floor(i/12)%10]+['平','安','宁','正','恭','谨','和','端','肃','诚','通','实'][Math.floor(i/120)%12],
 realm:s.polity as 'liang'|'east'|'west',home:s.id,family:'county-house-'+s.id,birth:500+i%18,sex:'male' as const,role:'scholar' as const,fictional:true,
 note:'546 年县级任官资料未核实，以架空地方士人补位；不代表史实县令。',source:{title:'剧本补位',url:''},
});});
export const historicalLocalAppointments=[
 {person:'xiao-yi',realm:'liang',level:'province',name:'江州',from:546,until:547,source:'https://zh.wikisource.org/wiki/梁書/卷05'},
 {person:'dugu-xin',realm:'west',level:'province',name:'秦州',from:546,until:547,source:'https://zh.wikisource.org/wiki/周書/卷16'},
 {person:'xiao-ji',realm:'liang',level:'province',name:'益州',from:546,until:547,source:'https://zh.wikisource.org/wiki/梁書/卷55'},
] as const;
