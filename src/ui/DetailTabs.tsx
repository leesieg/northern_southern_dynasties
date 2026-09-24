import {ArtIcon,type ArtName} from './ArtIcon';
import './detailPanels.css';
export function DetailTabs<T extends string>({label,value,items,onChange}:{label:string;value:T;items:readonly {id:T;label:string;icon:ArtName}[];onChange:(id:T)=>void}){
 return <nav className="detail-tabs" aria-label={label}>{items.map(item=><button key={item.id} type="button" aria-pressed={value===item.id} onClick={()=>onChange(item.id)}><ArtIcon name={item.icon} size={26}/><span>{item.label}</span></button>)}</nav>;
}
