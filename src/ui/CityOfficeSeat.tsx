import {LocalOfficeSeat} from './LocalAdministration';
import type {World,GameCommand} from '../core/types';
export function CityOfficeSeat(props:{world:World;site:string;pending:boolean;send:(c:GameCommand)=>void;onPerson?:(id:string)=>void}){const r=props.world.realm?.cities[props.site]?.owner;if(!r||r==='frontier')return null;return <div className="city-office-seat"><LocalOfficeSeat {...props} territory={'city:'+props.site} realm={r}/></div>;}
