import type { CSSProperties } from 'react';
import type {Trait} from '../core/social';
import {TraitIcon} from './TraitIcon';
import './artIcons.css';
export const artIcons={coins:0,grain:1,renown:2,influence:3,diligent:4,frugal:5,generous:6,gregarious:7,wary:8,steadfast:9,stress:10,army:11,person:12,city:13,world:14,estate:15} as const;
export type ArtName=keyof typeof artIcons;
export function ArtIcon({name,size=32}:{name:ArtName;size?:number}){const index=artIcons[name];return <span aria-hidden="true" className="art-icon" style={{width:size,height:size,backgroundPosition:`${index%4*100/3}% ${Math.floor(index/4)*100/3}%`} as CSSProperties}/>;}
export function Resource({name,value,label,unit='',caption=false}:{name:ArtName;value:number|string;label:string;unit?:string;caption?:boolean}){return <span className="art-resource" title={`${label}：${value}${unit}`} aria-label={`${label}：${value}${unit}`}><ArtIcon name={name}/><span className="art-resource-value">{caption&&<small>{label}</small>}<b>{value}</b>{unit&&<small className="art-unit">{unit}</small>}</span></span>;}
export function TraitBadge({trait}:{trait:Trait;detail?:boolean}){return <TraitIcon trait={trait}/>;}
