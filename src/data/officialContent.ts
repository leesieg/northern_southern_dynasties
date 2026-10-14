import {characterById} from './characters';
import {families,familyPeople,parentLinks} from './families';
import {relationshipPeople} from './relationships';
import {CONTENT_VERSION,sites,roads} from './scenario';
import {gameScripts} from './scripts';
import {createContentRegistry,type ContentSource} from '../core/contentRegistry';

/** Always copy the established source data. This catalogue does not authorize
 * arbitrary edited packages to enter the still-official simulation rules. */
export function createOfficialContent(){
 return createContentRegistry({
  format:'fynbc-content-catalog',schemaVersion:1,packageId:'official-nsd',contentVersion:CONTENT_VERSION,
  sites,roads,characters:Object.values(characterById),people:relationshipPeople,
  families,familyPeople,parentLinks,scripts:gameScripts as ContentSource['scripts'],
 });
}
