import {relationshipPersonById} from '../data/relationships';
import {territoryNodes} from '../data/territorialHierarchy';
import {validPersonalEconomy} from './personalEconomyRules';
import type {World} from './types';
/** Historic liability remains valid after death or occupation; identifiers must still be real. */
export function validEconomyWorld(w: World): boolean {
  if (w.economy === undefined) return true;
  if (w.mode !== 'sandbox' || !w.realm || !validPersonalEconomy(w.economy, w.day,
    id => Object.hasOwn(relationshipPersonById, id),w.scriptId)) return false;
  const validAccount = (id: string, realm: string) => {
    if (!['liang', 'east', 'west'].includes(realm)) return false;
    if (id === 'central:' + realm) return true;
    if (!id.startsWith(realm + '|')) return false;
    const t = id.slice(realm.length + 1), n = territoryNodes[t];
    return !!n && ['city', 'province', 'prefecture'].includes(n.level);
  };
  return w.economy.misconduct.every(m => validAccount(m.account, m.realm))
    && w.economy.investigations.every(q => validAccount(q.account, q.realm));
}
