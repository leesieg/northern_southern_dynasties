const KEY='fynbc.tipsSeen';
const read=():string[]=>{try{const v=JSON.parse(localStorage.getItem(KEY)??'[]');return Array.isArray(v)?v.filter(x=>typeof x==='string'):[];}catch{return[];}};
export const tipSeen=(id:string)=>{try{return read().includes(id);}catch{return true;}};
export function markTipSeen(id:string){try{const list=read();if(!list.includes(id))localStorage.setItem(KEY,JSON.stringify([...list,id]));}catch{}}
export const firstTips:Record<string,string>={
 realm:'这里汇总你职责内的文书。先处理案头待办；案头清空时，可按志向的下一步行动。',
 diplomacy:'从本国邦交看起：使团、条约与战争在此处理；点国徽进入他国。',
 military:'军队、将领、战事分页管理。征募前核对兵源与钱粮；调兵须有军务权限。',
 intrigue:'筹划中的谋略、密约与宣称都在这里；发起前会列出条件与代价。',
 wealth:'私财与公款分账。庄园、事业与私人往来在此经营。',
};
