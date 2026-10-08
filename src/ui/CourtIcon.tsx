import type {CourtPhase} from '../data/court';

/** Decorative artwork; the enclosing control supplies its action or phase label. */
export function CourtIcon({name='court',size=32}:{name?:'court'|CourtPhase;size?:number}){
 return <img className="court-art-icon" src={import.meta.env.BASE_URL+`art/court/icons-v1/${name}.png`} width={size} height={size} alt="" aria-hidden="true" draggable={false}/>;
}
