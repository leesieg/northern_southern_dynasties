import type {World} from './types';
import type {RealmId} from './realm';
export type HistoricalPhase='dormant'|'north'|'reception'|'settlement'|'dispute'|'rebellion'|'siege'|'court'|'aftermath';
export interface HistoricalMilestone {key:string;day:number;text:string;public:boolean;realms:RealmId[];people:string[]}
export interface HistoricalDecision {id:string;revision:number;actor:string;kind:'north'|'council'|'crisis';created:number;handled?:boolean}
export interface HistoricalEventInstance {
 id:string;definitionId:'hou-jing';definitionVersion:1;phase:HistoricalPhase;status:'active'|'resolved'|'cancelled';phaseSince:number;
 actors:{protagonist:string;protector:string};origin:RealmId;host?:RealmId;site:string;
 pactId?:number;warId?:number;handlingDue?:number;stableSince?:number;lastConflict?:string;decision?:HistoricalDecision;
 revision:number;milestones:HistoricalMilestone[];appliedEffects:string[];result?:string;resolvedAt?:number;
}
export interface HistoricalState {version:1;since:number;items:HistoricalEventInstance[]}
export type HistoricalCommand={type:'historicalEvent';instanceId:string;decisionId:string;revision:number;optionId:'wait'|'seek'|'assure'|'rise';realm?:RealmId;terms?:import('./allegiancePacts').ReceptionTerms};
/** One decision owner. Ordinary player commands remain available. */
export function historicalOwnsDecision(w:World,person:string){return w.mode==='sandbox'&&person==='hou-jing'&&!!w.historical?.items.some(e=>e.actors.protagonist===person&&e.status!=='cancelled');}
