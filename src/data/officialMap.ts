import {createMapRegistry} from '../core/mapRegistry';
import {roads,sites} from './scenario';

/** Existing rule API; each package's module realm builds its own map and cache. */
export const officialMap=createMapRegistry(sites,roads);
