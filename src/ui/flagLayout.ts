/** A fixed available span, with at least 32px of exposed target per flag before wrapping. */
export function flagLayout(width:number,count:number){
 const available=Math.max(1,width),columns=Math.max(1,Math.min(count,Math.floor(available/32)));
 return {columns,slot:Math.min(68,Math.floor(available/columns))};
}
