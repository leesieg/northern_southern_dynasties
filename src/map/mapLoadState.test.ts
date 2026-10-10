import {it,expect} from 'vitest';
import {clearMapNotice} from './mapLoadState';
it('clears recovered detail warnings without removing other resource failures',()=>{const warnings=[{source:'detail-dem',message:'本地近景高程加载失败'},{source:'art',message:'纸绘加载失败'}];expect(clearMapNotice(warnings,'detail-dem')).toEqual([warnings[1]]);expect(clearMapNotice(warnings,'models')).toEqual(warnings);});
