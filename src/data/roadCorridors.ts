/** Design geometry for the existing road graph, guided by the Yangtze valley and Guanzhong corridor.
 * These intermediate coordinates are illustrative corridors, not surveyed ancient roads or new travel nodes.
 * Endpoints remain scenario.ts's authoritative city anchors. Durations, permissions and provisions remain unchanged.
 */
export const roadCorridors:Record<string,[number,number][]>= {
 'jiankang:xunyang':[[118.35,31.25],[117.8,30.9],[117.15,30.45],[116.55,29.95]],
 'xunyang:jiangling':[[115.25,29.85],[114.9,30.35],[114.3,30.6],[113.6,30.4]],
 'changan:luoyang':[[109.5,34.5],[110.2,34.6],[110.8,34.55],[111.6,34.7]],
 'hanzhong:changan':[[106.95,33.35],[106.95,33.85],[107.2,34.35],[108.0,34.3]],
 // The old curves above remain for booked legacy trips. The reviewed network uses
 // the following schematic river/pass approaches; these are not surveyed roadbeds.
 'linshui:wuan':[[114.10,36.48],[114.06,36.57]],
 'wuan:jinyang':[[113.70,36.56],[113.39,36.52],[113.06,36.55],[112.87,36.84],[112.76,37.35]],
 'yiyang-weiyin:zhongshan':[[114.50,37.05],[114.52,37.65],[114.65,38.14]],
 'zhongshan:zhuoxian':[[115.20,38.78],[115.48,39.05]],
 'weixian:jibei':[[115.48,36.23],[115.96,36.37]],
 'lixia:qingzhou':[[117.54,36.73],[118.00,36.75]],
 'luoyang:jixian':[[112.65,34.92],[113.08,35.08],[113.63,35.26]],
 'luoyang:chenliu':[[113.03,34.79],[113.43,34.88],[113.82,34.85]],
 'chenliu:pengcheng':[[115.05,34.57],[115.65,34.44],[116.42,34.42]],
 'yongxian:tianshui':[[107.14,34.78],[106.87,34.89],[106.40,34.75],[106.13,34.61]],
 'changan:fengyi':[[108.96,34.50],[109.17,34.62],[109.50,34.78]],
 'fengyi:puzhou':[[110.06,34.88],[110.27,34.85]],
 'bacheng:xinfeng':[[109.19,34.39]],
 'xinfeng:huayin':[[109.61,34.51],[109.91,34.52]],
 'hanzhong:huxian':[[107.35,33.15],[107.56,33.23],[107.70,33.55],[107.82,33.86],[108.14,34.05],[108.28,34.13]],
 'xiangyang:nanxiang':[[111.51,32.57],[110.78,32.69],[110.10,32.82],[109.31,32.83],[108.53,32.91]],
 'fuxian:hanzhong':[[105.10,31.95],[105.57,32.23],[105.83,32.44],[106.26,32.83],[106.63,33.15]],
 'yufu:bajun':[[109.04,30.95],[108.40,30.82],[107.72,30.37],[107.40,29.70],[106.90,29.75]],
 'baling:jiangling':[[112.89,29.52],[112.45,29.71],[112.29,30.05]],
 'baling:changsha':[[112.88,29.12],[112.88,28.65]],
 'changsha:guiyang':[[112.92,27.84],[112.61,27.13],[112.73,26.62]],
 'guiyang:shixing':[[112.95,25.39],[113.13,25.12],[113.35,24.94]],
 'wujun:qiantang':[[120.70,31.00],[120.75,30.76],[120.55,30.56],[120.36,30.39]],
 'qiantang:kuaiji':[[120.20,30.19],[120.33,30.17],[120.49,30.08]],
};
