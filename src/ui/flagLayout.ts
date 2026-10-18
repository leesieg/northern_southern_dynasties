/** A fixed available span, with at least 32px of exposed target per flag before wrapping. */
export function flagLayout(width:number,count:number,maxSlot=64){
 const available=Math.max(1,width),columns=Math.max(1,Math.min(count,Math.floor(available/32)));
 return {columns,slot:Math.min(maxSlot,Math.floor(available/columns))};
}
