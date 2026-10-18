import type {World,Polity} from '../core/types';
import {provisionalRealm} from '../core/polityRuntime';
import {governmentOf,regimeName} from '../core/government';
import {getPerson} from '../core/personRegistry';

/** Map banners use the current government leader's name; dossiers retain the full government name. */
export function mapRealmName(w:World|undefined,r:Polity){
 const g=w&&r!=='frontier'&&provisionalRealm(w,r)?governmentOf(w,r):undefined;
 return g&&w?getPerson(w,g.executives[0]??g.ruler)?.name??regimeName(w,r):regimeName(w,r);
}
