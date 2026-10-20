/** Population and troop counts are stored in simulation units; the interface shows ten times as many people. */
export const PEOPLE_SCALE=10;
export const px=(n:number)=>n*PEOPLE_SCALE;
export const unpx=(n:number)=>Math.round(n/PEOPLE_SCALE);
