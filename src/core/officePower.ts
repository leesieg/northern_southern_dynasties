import {territoryNodes} from '../data/territorialHierarchy';
import {localHolder, localActive} from './localAdministration';
import type {RealmId} from './realm';
import type {World} from './types';
/** A live local position is recognized consistently by relations and founding rules.
 * Nested/concurrent seats use the strongest mandate instead of counting the same population twice.
 */
export function localPoliticalBasis(w: World, person: string, realm: RealmId): number {
  let power = 0;
  for (const n of Object.values(territoryNodes)) {
    if (!['province', 'prefecture', 'city'].includes(n.level)) continue;
    if (localHolder(w, n.id, realm) !== person || !localActive(w, n.id, realm)) continue;
    power = Math.max(power, n.level === 'province' ? 20 : n.level === 'prefecture' ? 15 : 10);
  }
  return power;
}
