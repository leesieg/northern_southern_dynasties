/** Keep usable depth precision at national-map distances without clipping close landmarks. */
export function cameraNearPlane(distance:number){return Math.max(1,Math.min(200,distance*.02));}
