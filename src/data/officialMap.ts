import {createMapRegistry} from '../core/mapRegistry';
import {roads,sites} from './scenario';

/** Compatibility adapter for existing rules; editor snapshots use their own registry. */
export const officialMap=createMapRegistry(sites,roads);
