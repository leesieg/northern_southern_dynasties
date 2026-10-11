import type {World} from '../core/types';
import type {RealmId} from '../core/realm';
import type {GovernmentType,ReformId} from '../data/governments';
import {governmentBonus,governmentOf} from '../core/government';
/** Compare effects under today's conditions; not a prediction of conditions after the effective work days. */
export function governmentPreview(w:World,r:RealmId,change:{government?:GovernmentType;law?:ReformId}){const g=governmentOf(w,r);if(!g||!w.realm?.governments)return null;const projected:World={...w,realm:{...w.realm,governments:{...w.realm.governments,realms:{...w.realm.governments.realms,[r]:{...g,type:change.government??g.type,laws:change.law?[...new Set([...g.laws,change.law])]:g.laws}}}}};return governmentBonus(projected,r);}
