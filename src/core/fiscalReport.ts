import type {FiscalEntry} from './treasury';

/** Derived display values in coins. Internal transfers cancel for an account set. */
export function fiscalReport(entries:readonly FiscalEntry[],accounts:readonly string[],since:number,until:number){
 const keys=new Set(accounts),income:FiscalEntry[]=[],expense:FiscalEntry[]=[];
 for(const entry of entries){
  if(entry.day<since||entry.day>until)continue;
  const from=keys.has(entry.from),to=keys.has(entry.to);
  if(from===to)continue;
  (to?income:expense).push(entry);
 }
 const total=(rows:FiscalEntry[])=>rows.reduce((n,e)=>n+e.coins,0);
 const groups=(rows:FiscalEntry[])=>{const grouped=new Map<string,FiscalEntry[]>();for(const entry of rows){const key=entry.reason||'其他已记账收支';grouped.set(key,[...(grouped.get(key)??[]),entry]);}return [...grouped].map(([label,items])=>({label,total:total(items),entries:items}));};
 return {income:total(income),expense:total(expense),net:total(income)-total(expense),incoming:groups(income),outgoing:groups(expense),entries:[...income,...expense].sort((a,b)=>b.id-a.id)};
}
