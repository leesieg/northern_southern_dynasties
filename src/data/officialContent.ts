import {characterById} from './characters';
import {families,familyPeople,parentLinks} from './families';
import {relationshipPeople} from './relationships';
import {CONTENT_VERSION,sites,roads} from './scenario';
import {gameScripts} from './scripts';
import {createContentRegistry,type ContentSource} from '../core/contentRegistry';

/** Read-only projection of the official source data; it is not a runnable package. */
export function createOfficialContent(){
 return createContentRegistry({
  format:'fynbc-content-catalog',schemaVersion:1,packageId:'official-nsd',contentVersion:CONTENT_VERSION,
  sites,roads,characters:Object.values(characterById),people:relationshipPeople,
  families,familyPeople,parentLinks,scripts:gameScripts as ContentSource['scripts'],
 });
}
