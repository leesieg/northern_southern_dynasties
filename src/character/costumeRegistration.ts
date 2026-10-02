/** Registration observed on the authored source sheets, in cell-local pixels.
 * It is anatomy/art metadata, independent of facial alleles and the current office. */
type Pair=[number,number,number,number];
export const headRegistration:Record<string,{neck:Pair;rim:Pair}>={
 'c-young-adult-v1':{neck:[350,450,476,577],rim:[440,238,626,194]},
 'gao-huan':{neck:[390,380,535,525],rim:[420,198,625,164]},
 'xiao-yan':{neck:[390,390,535,515],rim:[425,203,637,184]},
 female:{neck:[380,442,542,588],rim:[420,195,651,175]},
 'dugu-xin':{neck:[315,305,399,389],rim:[333,170,518,138]},
 'yuwen-tai':{neck:[316,310,417,383],rim:[336,174,523,143]},
 'xiao-gang':{neck:[290,316,380,422],rim:[307,170,497,145]},
 'xiao-yi':{neck:[300,318,382,405],rim:[318,168,508,142]},
 'gao-cheng':{neck:[310,313,397,397],rim:[327,170,516,145]},
 'gao-yang':{neck:[310,309,393,390],rim:[323,163,515,141]},
 'yuan-baoju':{neck:[300,309,389,398],rim:[319,164,506,140]},
 'yuan-qin':{neck:[328,329,419,430],rim:[347,178,538,153]},
 fictional:{neck:[315,320,397,418],rim:[326,163,527,137]},
 child:{neck:[285,384,386,488],rim:[304,185,505,162]},
 'female-north':{neck:[276,314,390,410],rim:[304,142,484,115]},
 'lou-zhaojun':{neck:[284,331,396,435],rim:[310,153,499,126]},
 'wang-lingbin':{neck:[272,320,385,416],rim:[297,141,483,114]},
 'xu-zhaopei':{neck:[272,315,380,415],rim:[293,141,481,115]},
 'chen-baxian':{neck:[312,324,401,409],rim:[323,167,534,136]},
};
export interface CostumeRegistration {neck:Pair;rim:Pair|null;bodyTop:number;seam?:[number,number][]}
// Seam points partition the shared atlas into complementary hat/body silhouettes.
// Han civilian / official / commander, then Xianbei civilian / official / commander.
export const costumeRegistration:Record<'male'|'female'|'child',CostumeRegistration[]>={
 male:[
  {neck:[205,182,273,243],rim:[193,98,315,96],bodyTop:177,seam:[[0,212],[145,212],[202,177],[418,177]]},
  {neck:[210,183,277,241],rim:[180,105,290,97],bodyTop:178,seam:[[0,217],[153,217],[207,178],[418,178]]},
  {neck:[188,183,250,246],rim:[169,123,282,120],bodyTop:180,seam:[[0,200],[177,200],[191,180],[270,180],[285,200],[418,200]]},
  {neck:[200,172,270,225],rim:[190,105,306,104],bodyTop:168,seam:[[0,200],[145,200],[200,168],[418,168]]},
  {neck:[205,180,264,228],rim:[180,105,292,106],bodyTop:173,seam:[[0,215],[145,215],[205,173],[418,173]]},
  {neck:[190,183,248,242],rim:[164,125,281,118],bodyTop:175,seam:[[0,195],[177,195],[191,175],[270,175],[292,195],[418,195]]},
 ],
 female:[
  // Preserve the accepted hair/bun ornament instead of adding a second floating pin.
  {neck:[187,164,238,183],rim:null,bodyTop:157},
  {neck:[186,164,239,183],rim:[177,112,269,117],bodyTop:157},
  {neck:[190,186,252,232],rim:[177,126,279,120],bodyTop:180,seam:[[0,200],[174,200],[190,180],[280,180],[302,200],[418,200]]},
  {neck:[194,151,259,169],rim:[180,80,300,81],bodyTop:143,seam:[[0,180],[171,180],[194,143],[418,143]]},
  {neck:[194,150,250,169],rim:[180,92,302,96],bodyTop:143,seam:[[0,184],[150,184],[194,143],[418,143]]},
  {neck:[190,162,252,217],rim:[170,116,285,108],bodyTop:149,seam:[[0,180],[179,180],[191,149],[264,149],[286,180],[418,180]]},
 ],
 child:[
  {neck:[310,246,404,324],rim:null,bodyTop:236},
  {neck:[309,248,413,321],rim:null,bodyTop:236},
 ],
};

/** V2 bodies use the accepted half-length brush style and include complete forearms/hands.
 * Coordinates describe the collar, not the cut neck stump. V1 remains headwear-only. */
export const bodyRegistration:Record<'male'|'female'|'child',{neck:Pair;top:number}[]>={
 male:[
  {neck:[163,126,245,207],top:110},{neck:[166,126,248,207],top:110},{neck:[164,126,248,207],top:110},
  {neck:[164,88,245,163],top:68},{neck:[166,88,248,163],top:68},{neck:[164,88,248,163],top:68},
 ],
 female:[
  {neck:[175,86,265,173],top:48},{neck:[171,85,262,169],top:48},{neck:[175,85,263,171],top:48},
  {neck:[175,39,265,116],top:8},{neck:[172,39,263,116],top:8},{neck:[175,39,265,116],top:8},
 ],
 child:[{neck:[305,387,420,482],top:350},{neck:[305,387,420,482],top:350}],
};
