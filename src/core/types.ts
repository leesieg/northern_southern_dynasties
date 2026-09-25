import type {RetinueState,RetinueCommand} from './retinue';
import type {MobilityState,MobilityCommand} from './mobilityState';
import type {ServiceState,ServiceCommand} from './assignments';
import type {PauseEvent} from './pauseEvents';
import type {DutiesState,DutyCommand} from './duties';
import type { LifeState,LifeCommand } from './lifeState';
import type { DiplomacyState,DiplomacyCommand } from './diplomacy';
import type { RelationshipState,RelationshipCommand } from './relationships';
import type { CourtCommand } from './court';
import type { GovernmentCommand } from './government';
import type { FamilyState } from './family';
import type { LifestyleState,LifestyleCommand } from './lifestyle';
import type { IdentityState } from '../data/characterIdentities';
import type { RealmState,RealmCommand } from './realm';
import type { Social, SocialCommand } from './social';
import type { Campaign } from './campaign';
import type { BuildCommand, Holdings } from './construction';
export type Polity = 'liang' | 'east' | 'west' | 'frontier';
export interface Site {
  id: string; name: string; lon: number; lat: number; polity: Polity;
  terrain: '平原' | '山地' | '河谷' | '绿洲' | '丘陵';
  description: string; capital?: boolean; rank?: 'county';
}
export interface Road { from: string; to: string; factor: number }
export interface Journey { route: string[]; leg: number; elapsed: number; durations: number[]; started: number }
export interface Person {
  id: string; name: string; location: string; home: string; coins: number; food: number;
  journey: Journey | null; itinerary: string[]; itineraryIndex: number;
}
export interface Chronicle { day: number; text: string; person: string }
export interface World {
  deeds?: import('./deeds').Deeds;
  economy?: import('./personalEconomyRules').PersonalEconomyState;
  version: 2; retinue?:RetinueState; mobility?:MobilityState; service?:ServiceState; duties?:DutiesState; life?:LifeState; diplomacy?:DiplomacyState; relationships?:RelationshipState; families?:FamilyState; lifestyles?:LifestyleState; identities?:IdentityState; mode?:'sandbox'; realm?:RealmState; scriptId?:string; social?:Social; characterId?:string; campaign?:Campaign; holdings: Holdings; contentVersion: string; day: number; people: Person[]; chronicle: Chronicle[];
}
export interface RoutePlan { route: string[]; durations: number[]; days: number; food: number; distance: number }
export type GameCommand = import('./armyOrganization').ArmyCommand | import('./personalEconomyAdapter').PersonalEconomyCommand | import('./appointmentCycle').AppointmentCommand | import('./population').PopulationCommand
  | { type: 'travel'; destination: string }
  | { type: 'provision' }
  | { type: 'commission' }
  | import('./localAdministration').LocalCommand | import('./treasury').FiscalCommand | RetinueCommand | MobilityCommand | ServiceCommand | DutyCommand | LifeCommand | DiplomacyCommand | RelationshipCommand | CourtCommand | GovernmentCommand | BuildCommand | SocialCommand | RealmCommand | LifestyleCommand;
export type Request =
  | { type: 'init' }
  | { type:'new';mode?:'sandbox'|'tutorial';scriptId?:string;characterId?:string }
  | { type:'resume'|'menu' }
  | { type: 'speed'; speed: number }
  | { type: 'step' }
  | { type: 'background' }
  | { type: 'command'; command: GameCommand }
  | { type: 'save' }
  | { type: 'load'; slot: string }
  | { type: 'delete-save'; slot: string }
  | { type: 'export' }
  | { type: 'import'; text: string };
export interface SaveInfo { mode?:'sandbox'; scriptId?:string; characterName?:string; id: string; savedAt: number; day: number }
export type Reply =
  | {type:'paused';events:PauseEvent[]}
  | { type:'screen';page:'menu'|'play' }
  | { type: 'world'; world: World; speed: number; slots: SaveInfo[]; lastSaved: number | null }
  | { type: 'notice'; text: string; error?: boolean }
  | { type: 'export'; text: string };
