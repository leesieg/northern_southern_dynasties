import {selectContent} from '../core/contentBinding';
import type {EventDefinition} from '../core/eventDefinitions';
/** Official gameplay has no author events; packages explicitly opt in. */
export let authoredEventDefinitions:EventDefinition[]=[];
({authoredEventDefinitions}=selectContent('authoredEvents',{authoredEventDefinitions}));
