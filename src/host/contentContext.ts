import type {ContentPackage,ContentEnvironment} from '../core/contentPackage';
import type {ContentLaunch,createContentLibrary} from '../persistence/contentLibrary';
export interface ContentContext {content:ContentPackage;environment:ContentEnvironment;scope?:string;library:ReturnType<typeof createContentLibrary>;launch?:ContentLaunch}
let context:ContentContext;
export function setContentContext(value:ContentContext){context=value;}
export function getContentContext(){if(!context)throw new Error('请先解析本局内容包。');return context;}
export const LAUNCH_KEY='fynbc-content-launch';
