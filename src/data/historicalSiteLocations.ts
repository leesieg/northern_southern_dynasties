import {selectContent} from '../core/contentBinding';
/** 546 CE location audit: research/heritage anchors, never surveyed ancient boundaries.
 * CHGIS coordinate adaptations: Harvard University / Fudan University, CC BY-NC 4.0.
 * Detailed evidence and unresolved sites: docs/历史资料/城址位置与地形核验.md.
 * These metadata correct map anchors only; terrain economy coefficients stay unchanged.
 */
export let historicalSiteLocations:Record<string,{lon:number;lat:number;source:string;note:string}>= {
  "hefei": {
    "lon": 117.27646,
    "lat": 31.86446,
    "source": "https://chgis.hudci.org/tgaz/placename/hvd_43059",
    "note": "合肥旧城范围，非现代市区西南锚点。"
  },
  "xunyang": {
    "lon": 115.94367,
    "lat": 29.64157,
    "source": "https://chgis.hudci.org/tgaz/placename/hvd_41145",
    "note": "按剧本所指柴桑县治，定位九江西南；不以现代九江市中心代替。"
  },
  "changsha": {
    "lon": 112.97813,
    "lat": 28.1982,
    "source": "https://chgis.hudci.org/tgaz/placename/hvd_41716",
    "note": "临湘县治，长沙老城湘江东岸。"
  },
  "danyang": {
    "lon": 118.71336,
    "lat": 31.65601,
    "source": "https://chgis.hudci.org/tgaz/placename/hvd_41377",
    "note": "六朝丹阳县治在今当涂丹阳镇一带。"
  },
  "liyang": {
    "lon": 118.96815,
    "lat": 31.30557,
    "source": "https://chgis.hudci.org/tgaz/placename/hvd_40583",
    "note": "六朝溧阳在今高淳固城，不是现代溧阳市区。"
  },
  "yongshi": {
    "lon": 119.46861,
    "lat": 31.37004,
    "source": "https://chgis.hudci.org/tgaz/placename/hvd_40591",
    "note": "永世在今溧阳南古县一带。"
  },
  "xinfeng": {
    "lon": 109.37344,
    "lat": 34.44956,
    "source": "https://chgis.hudci.org/tgaz/placename/hvd_70726",
    "note": "采用 188—556 年新丰治所，不套用汉初新丰或现代街道。"
  },
  "wuan": {
    "lon": 113.95383,
    "lat": 36.63715,
    "source": "https://chgis.hudci.org/tgaz/placename/hvd_82228",
    "note": "隋代迁治前的武安故城，在今武安西南固镇。"
  },
  "fanyang": {
    "lon": 114.86162,
    "lat": 36.07414,
    "source": "https://chgis.hudci.org/tgaz/placename/hvd_82248",
    "note": "采用 495—555 年繁阳，今内黄东北楚旺附近。"
  },
  "yinxian": {
    "lon": 121.55294,
    "lat": 29.68952,
    "source": "https://chgis.hudci.org/tgaz/placename/hvd_40755",
    "note": "秦汉至南朝鄞县治在奉化白杜，非宁波城区。"
  },
  "zhijiang": {
    "lon": 111.69465,
    "lat": 30.37009,
    "source": "https://chgis.hudci.org/tgaz/placename/hvd_43721",
    "note": "东晋至唐初枝江县治在百里洲西部一带；现代水道与古城址有变。"
  },
  "yufu": {
    "lon": 109.56633,
    "lat": 31.04914,
    "source": "https://chgis.hudci.org/tgaz/placename/hvd_44484",
    "note": "鱼复郡县治按白帝城一带定位，非现代奉节新城。"
  },
  "linzi": {
    "lon": 118.37041,
    "lat": 36.86401,
    "source": "https://chgis.hudci.org/tgaz/placename/hvd_85234",
    "note": "556 年省县前的临淄故城范围。"
  },
  "langya": {
    "lon": 118.24029,
    "lat": 35.08121,
    "source": "https://chgis.hudci.org/tgaz/placename/hvd_85578",
    "note": "469 年迁治后的即丘在临沂西古城，非旧即丘镇。"
  },
  "jixian": {
    "lon": 113.96857,
    "lat": 35.38237,
    "source": "https://chgis.hudci.org/tgaz/placename/hvd_82255",
    "note": "汲县治在卫辉西南汲城；不将汲郡枋头郡治混为县治。"
  },
  "shangdang": {
    "lon": 113.16126,
    "lat": 36.12149,
    "source": "https://chgis.hudci.org/tgaz/placename/hvd_95326",
    "note": "501 年迁治后的壶关在城头村一带，非今长治城区。"
  },
  "puzhou": {
    "lon": 110.33231,
    "lat": 34.83513,
    "source": "https://chgis.hudci.org/tgaz/placename/hvd_95495",
    "note": "蒲坂在蒲州故城一带，非现代永济城区。"
  },
  "fuhan": {
    "lon": 102.98101,
    "lat": 35.49667,
    "source": "https://chgis.hudci.org/tgaz/placename/hvd_70126",
    "note": "采用历史枹罕县治资料点，非现代临夏市区；点位为研究定位。"
  },
  "yubi": {
    "lon": 110.94722222222222,
    "lat": 35.57083333333334,
    "source": "https://loca.fudan.edu.cn/coca/PDF/2011/COMONCA05-003.pdf",
    "note": "稷山白家庄峨眉塬北缘，汾河南岸高台，东西深沟；考察记录定位，非复原城墙边界。"
  },
  "luoyang": {
    "lon": 112.62138888888889,
    "lat": 34.73111111111111,
    "source": "https://iidos.cn/uploadfiles/2022/11/20221124155246422.pdf",
    "note": "汉魏洛阳故城遗产定位，位于现代洛阳城区以东；不是隋唐洛阳。"
  },
  "ye": {
    "lon": 114.41195,
    "lat": 36.27238,
    "source": "https://chgis.hudci.org/tgaz/placename/hvd_82198",
    "note": "临漳西南邺城遗址范围；东魏都邺南城，定位为城址范围锚点。"
  },
  "jinyang": {
    "lon": 112.48,
    "lat": 37.72,
    "source": "https://www.jcgov.gov.cn/dtxx/sxyw/202211/t20221126_1706303.shtml",
    "note": "晋源古城营附近的晋阳遗址范围，区域近似定位；不套用安徽侨置晋阳县。"
  },
  "changan": {
    "lon": 108.89,
    "lat": 34.31,
    "source": "https://www.nopss.gov.cn/n1/2023/0809/c448861-40053347.html",
    "note": "汉长安城遗址范围的近似中心；西魏沿用旧长安，不以隋唐城或现代西安市中心定位。"
  }
};

// Compiled data is selected before any importing rule module can execute.
({historicalSiteLocations}=selectContent('historicalSiteLocations',{historicalSiteLocations}));
