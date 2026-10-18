import {useId} from 'react';

// Illustrations retain the immutable reference; fittings use a separate RGBA
// extraction so the source map and annotation matte cannot reach their edges.
const atlas=import.meta.env.BASE_URL+'art/interface/reference-hud.png';
const cleanAtlas=import.meta.env.BASE_URL+'art/interface/reference-hud-clean-v1.png';
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
 person:{box:'0 0 720 180',shape:'M0 0H720V180H0Z'},
 clock:{box:'1080 0 592 166',shape:'M1080 0H1672V129H1080Z M1080 129H1435V166H1080Z M1636 129H1672V166H1636Z M1397 129H1427V228H1397Z'},
 rail:{box:'0 180 200 761',shape:'M0 180H200V941H0Z',holes:Array.from({length:8},(_,i)=>`M5 ${224+i*74}H168V${298+i*74}H5Z`).join(' ')},
 button:{box:'4 300 164 74',shape:'M4 300H168V374H4Z'},
 dial:{box:'1322 605 350 336',shape:'M1483 658A117 117 0 1 1 1482.99 658Z M1414 872H1672V941H1414Z M1544 830H1672V872H1544Z',holes:'M1547 832H1625V885H1547Z M1514 896H1646V926H1514Z'},
 medallion:{box:'1451 606 62 62',shape:'M1482 607A30 30 0 1 1 1481.99 607Z',holes:'M1482 613A24 24 0 1 1 1481.99 613Z'},
 flag:{box:'1435 129 102 183',shape:'M1435 129H1534V312H1435Z',holes:'M1451 166H1524V270L1487 298 1451 271Z'},
 silkFlag:{box:'1534 129 102 183',shape:'M1534 129H1634V312H1534Z',holes:'M1548 166H1623V270L1586 298 1548 271Z'},
 eventTrim:{box:'1528 166 144 439',shape:'M1634 166H1672V315H1634Z M1528 315H1672V605H1528Z'},
};
export function ReferenceHudFrame({kind}:{kind:Frame}){
 const id='reference-hud-'+useId().replace(/:/g,''),frame=frames[kind];
 const [x,y,width,height]=frame.box.split(' ').map(Number);
 return <svg className={'reference-hud-frame reference-hud-frame--'+kind} viewBox={frame.box} preserveAspectRatio="none" aria-hidden="true" focusable="false">
  <defs>
   <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="1672" height="941" style={{maskType:'luminance'}}><path d={frame.shape} fill="white"/>{frame.holes&&<path d={frame.holes} fill="black"/>}</mask>
   <filter id={id+'-alpha'} filterUnits="userSpaceOnUse" x={x} y={y} width={width} height={kind==='clock'?228:height} colorInterpolationFilters="sRGB"><feComponentTransfer><feFuncA type="linear" slope="1.02" intercept="-.01"/></feComponentTransfer></filter>
  </defs>
  <image href={cleanAtlas} width="1672" height="941" mask={'url(#'+id+')'} filter={'url(#'+id+'-alpha)'}/>
 </svg>;
}

export function ReferenceRailArt({name}:{name:ReferenceHudIconName}){
 return <><ReferenceHudFrame kind="button"/><span className="rail-emblem"><ReferenceHudIcon name={name}/></span></>;
}
