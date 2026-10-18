import {useId} from 'react';

// The user's 1672 × 941 reference is an immutable atlas. Masks expose fittings
// and illustrations only; example people, numbers, labels and geography stay hidden.
const atlas=import.meta.env.BASE_URL+'art/interface/reference-hud.png';
const crops={
 coins:[289,38,43,42],grain:[409,37,41,43],influence:[533,37,38,43],
 diligent:[289,91,46,43],renown:[410,91,39,44],stress:[535,93,37,36],
 government:[25,234,63,57],diplomacy:[25,306,63,59],military:[25,380,63,57],
 intrigue:[26,454,63,59],wealth:[25,528,63,59],search:[25,603,63,59],
 journal:[25,678,63,59],events:[25,752,63,59],
 political:[1358,676,29,29],domains:[1405,636,29,29],pacts:[1466,623,29,29],
 terrain:[1527,638,29,29],roads:[1573,675,29,29],
 location:[1358,812,27,31],camera:[1405,852,29,29],settings:[1338,738,28,28],
 focus:[1461,173,25,29],marriage:[1566,172,32,35],
} as const;
export type ReferenceHudIconName=keyof typeof crops;
export function ReferenceHudIcon({name}:{name:ReferenceHudIconName}){
 return <svg className="reference-hud-icon" viewBox={crops[name].join(' ')} aria-hidden="true" focusable="false"><image href={atlas} width="1672" height="941"/></svg>;
}

type Frame='person'|'clock'|'rail'|'button'|'dial'|'medallion'|'flag'|'silkFlag'|'eventTrim';
const frames:Record<Frame,{box:string;shape:string;holes?:string}>={
 person:{box:'0 0 720 180',shape:'M0 0H694L706 14 719 22 719 34 707 40 707 124 694 125 694 138 675 150 636 157H278L266 171H77L59 179H0Z',holes:'M33 32H130V130H33Z M144 37H272V134H144Z M281 29H652V137H281Z M91 148H255V165H91Z'},
 clock:{box:'1080 0 592 166',shape:'M1153 0H1672V132H1633L1605 145 1477 143 1458 151 1400 147 1380 156 1357 150 1329 153 1311 142 1253 143 1234 132 1190 137 1177 124 1175 114 1101 115 1094 104 1081 100 1081 88 1104 83 1124 63 1151 60Z',holes:'M1238 30H1450V112H1238Z M1476 38H1509V91H1476Z M1529 37H1635V64H1529Z M1530 78H1633V100H1530Z M1314 122L1327 127 1312 158 1303 155Z'},
 rail:{box:'0 180 200 761',shape:'M0 180H180L199 191 195 206 172 213 173 221 183 224 187 264 177 292 167 303 166 816 142 833 142 859 171 873 181 899 200 914V941H0Z',holes:Array.from({length:8},(_,i)=>`M5 ${224+i*74}H168V${298+i*74}H5Z`).join(' ')},
 button:{box:'4 300 164 74',shape:'M23 301H154L166 311V354L155 370H22L5 361V316Z',holes:'M20 314H151V358H20Z'},
 dial:{box:'1322 605 350 336',shape:'M1599 839L1629 848 1636 885 1672 889V941H1414L1419 920 1448 911 1436 892 1456 870Z M1483 660A115 115 0 1 1 1482.99 660Z',holes:'M1483 675A100 100 0 1 1 1482.99 675Z M1547 832H1625V885H1547Z M1514 896H1646V926H1514Z'},
 medallion:{box:'1451 606 62 62',shape:'M1482 607A30 30 0 1 1 1481.99 607Z',holes:'M1482 613A24 24 0 1 1 1481.99 613Z'},
 flag:{box:'1435 129 102 183',shape:'M1437 144H1447V135H1453V145H1484V130H1493V145H1529V141H1534V157H1528V277L1488 308 1445 280V157H1437Z',holes:'M1451 166H1524V270L1487 298 1451 271Z'},
 silkFlag:{box:'1534 129 102 183',shape:'M1536 144H1546V135H1552V145H1583V130H1592V145H1628V141H1633V157H1627V277L1587 308 1544 280V157H1536Z',holes:'M1548 166H1623V270L1586 298 1548 271Z'},
 eventTrim:{box:'1595 145 77 460',shape:'M1640 145H1672V605H1637V585H1604V550H1621V510L1639 480 1634 435 1614 422 1597 405 1603 384 1596 373 1599 360 1609 347 1598 331 1606 319 1596 312 1599 297 1619 307 1631 296 1617 283 1596 279 1599 259 1617 252 1635 267 1640 239Z'},
};
export function ReferenceHudFrame({kind}:{kind:Frame}){
 const id='reference-hud-'+useId().replace(/:/g,''),frame=frames[kind];
 return <svg className={'reference-hud-frame reference-hud-frame--'+kind} viewBox={frame.box} preserveAspectRatio="none" aria-hidden="true" focusable="false">
  <defs><mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="1672" height="941" style={{maskType:'luminance'}}><path d={frame.shape} fill="white"/>{frame.holes&&<path d={frame.holes} fill="black"/>}</mask></defs>
  <image href={atlas} width="1672" height="941" mask={'url(#'+id+')'}/>
 </svg>;
}

export function ReferenceRailArt({name}:{name:ReferenceHudIconName}){
 return <><ReferenceHudFrame kind="button"/><span className="rail-emblem"><ReferenceHudIcon name={name}/></span></>;
}
