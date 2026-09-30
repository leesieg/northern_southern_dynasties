import {renderToStaticMarkup} from 'react-dom/server';
import {RealmFlag} from '../ui/RealmFlag';
import type {Polity} from '../core/types';
const flags=new Map<string,string>();
/** The same original heraldry as country details, isolated SVG IDs in each image. */
export function armyHeraldry(realm:Polity,name:string){
 const key=realm+'|'+name;let url=flags.get(key);if(url)return url;
 const markup=renderToStaticMarkup(<RealmFlag realm={realm} name={name} showLabel={false}/>),svg=markup.slice(markup.indexOf('<svg'),markup.lastIndexOf('</svg>')+6).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" width="224" height="276" ');
 url='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);if(flags.size>=32)flags.delete(flags.keys().next().value!);flags.set(key,url);return url;
}
