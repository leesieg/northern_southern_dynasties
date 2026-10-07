/** Design geometry for the existing road graph, guided by the Yangtze valley and Guanzhong corridor.
 * These intermediate coordinates are illustrative corridors, not surveyed ancient roads or new travel nodes.
 * Endpoints remain scenario.ts's authoritative city anchors. Durations, permissions and provisions remain unchanged.
 */
export const roadCorridors:Record<string,[number,number][]>= {
 'jiankang:xunyang':[[118.35,31.25],[117.8,30.9],[117.15,30.45],[116.55,29.95]],
 'xunyang:jiangling':[[115.25,29.85],[114.9,30.35],[114.3,30.6],[113.6,30.4]],
 'changan:luoyang':[[109.5,34.5],[110.2,34.6],[110.8,34.55],[111.6,34.7]],
 'hanzhong:changan':[[106.95,33.35],[106.95,33.85],[107.2,34.35],[108.0,34.3]],
};
