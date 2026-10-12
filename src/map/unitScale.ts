/** Display units shared with the approved sample. Coordinates and gameplay stay unchanged. */
export const CAMPAIGN_BODY_SCALE=1;
export const campaignUnitPixels=(unitsPerPixel:number)=>CAMPAIGN_BODY_SCALE/Math.max(.0001,unitsPerPixel);
