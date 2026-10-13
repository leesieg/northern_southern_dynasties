import {OperationsArt,type OperationsScene} from './OperationsHeader';

const scenes={fortress:0,dispatch:1,care:2,succession:3,commerce:4,migration:5,rites:6,custody:7} as const;
export type DialogScene=OperationsScene|keyof typeof scenes;
/** Decorative paintings carry no game state, names or numbers. */
export function DialogArt({scene,className=''}:{scene:DialogScene;className?:string}){
 if(!(scene in scenes))return <OperationsArt scene={scene as OperationsScene} className={'dialog-art '+className}/>;
 const tile=scenes[scene as keyof typeof scenes];
 return <span className={'dialog-art '+className} aria-hidden="true"><svg viewBox="0 0 768 256" preserveAspectRatio="xMidYMid slice" focusable="false"><image href={import.meta.env.BASE_URL+'art/interface/dialog-scenes.png'} x={-(tile%2)*768} y={-Math.floor(tile/2)*256} width="1536" height="1024"/></svg></span>;
}
