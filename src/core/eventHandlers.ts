import {advanceHistorical,historicalPending} from './historicalEvents';
import {advanceAuthoredEvents,authoredPending} from './authoredEvents';
import type {World} from './types';
/** Native adapters retain ownership of their mechanics and persisted instances. */
export const eventHandlers=[
 {id:'historical-v1',editable:false,advance:advanceHistorical,pending:historicalPending},
 {id:'authored-v1',editable:true,advance:advanceAuthoredEvents,pending:authoredPending},
] as const;
export function advanceRegisteredEvents(w:World){for(const handler of eventHandlers)handler.advance(w);}
export function registeredEventDiagnostics(w:World){return eventHandlers.map(h=>({id:h.id,editable:h.editable,pending:h.pending(w),...(h.id==='historical-v1'?{state:structuredClone(w.historical??null)}:{state:structuredClone(w.authoredEvents??null)})}));}
