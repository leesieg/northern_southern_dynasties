import type {PaintedRigId} from './paintedRoster';

/** Offline registration of court-v2 source art against the original blank-face rig.
 * [uniform scale, normalized x offset, normalized y offset], sovereign then official.
 * Compare ear/cheek/jaw landmarks; bead curtains and changed chin hair must not drive
 * the fit. These are artwork coordinates, never facial genes or gameplay state.
 * Identity entries were checked too: absence of drift must not be inferred from size.
 */
type FaceTransform=readonly [scale:number,dx:number,dy:number];
export const courtFaceRegistration:Record<PaintedRigId|'c-young-adult-v1',readonly [FaceTransform,FaceTransform]>={
 'gao-huan':[[.96,.084,.014],[.98,.034,.008]],
 'xiao-yan':[[.95,.043,.010],[.95,.043,.010]],
 female:[[.94,.087,.012],[.98,.017,.003]],
 'dugu-xin':[[1,0,0],[1,0,0]],
 'yuwen-tai':[[1,0,0],[1,0,0]],
 'xiao-gang':[[1,0,0],[1,0,0]],
 'xiao-yi':[[1,0,0],[1,0,0]],
 'gao-cheng':[[1,0,0],[1,0,0]],
 'gao-yang':[[1,0,0],[1,0,0]],
 'yuan-baoju':[[1,0,0],[1,0,0]],
 'yuan-qin':[[1,.014,0],[1,0,0]],
 fictional:[[1,0,0],[1,0,0]],
 child:[[1,0,0],[1,0,0]],
 'female-north':[[1,.035,0],[1,0,0]],
 'lou-zhaojun':[[1,0,0],[1,0,0]],
 'wang-lingbin':[[1,0,0],[1,0,0]],
 'xu-zhaopei':[[1,.011,.002],[1,0,0]],
 'chen-baxian':[[1,0,0],[1,0,0]],
 'c-young-adult-v1':[[.96,.093,.007],[.98,.062,.005]],
};
