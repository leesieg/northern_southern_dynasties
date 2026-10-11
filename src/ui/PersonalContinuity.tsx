import type {World} from '../core/types';
import {personalHistoryView} from '../core/personalHistoryView';
import {politicalName} from '../core/government';
import {getPerson} from '../core/personRegistry';
import {CommandButton} from './CommandButton';
import './personalContinuity.css';

export function PersonalContinuity({world:w,unappointed,onEstate,onRelations,onOffice,onPerson}:{world:World;unappointed:boolean;onEstate:()=>void;onRelations:()=>void;onOffice:()=>void;onPerson:(id:string)=>void}){
 const history=personalHistoryView(w,w.characterId!);
 return <>{unappointed&&<section className="person-overview-group personal-continuity"><h3>行路与生计</h3><p>无官在身。经营家业、经营交往或再谋任用，由你选择。</p><div className="person-quick-actions"><CommandButton label="经营家业" icon="estate" hint="查看现有庄园、经营与家事；收益仍受所在地实控与生产条件限制。" onClick={onEstate}/><CommandButton label="拜访人物" icon="gregarious" hint="从关系列表选择人物，在互动中约见或求师；确认前查看行程、私财与行粮。" onClick={onRelations}/><CommandButton label="寻求任用" icon="influence" hint="查看官爵与任职，并经现有请任流程办理；旧职权不会自动恢复。" onClick={onOffice}/></div></section>}
 {(history.recommendation||history.records.length>0)&&<section className="person-overview-group personal-evidence"><h3>往来有据</h3>{history.recommendation&&<p className="personal-recommendation">幕僚修书荐举 · 任用评价 +{history.recommendation.bonus} · 尚余 {history.recommendation.until-w.day} 日<small>已计入任用依据；到期失效，不能替代任职资格。</small></p>}<div className="personal-evidence-list">{history.records.map(row=><article key={row.key}><header><strong>{row.title}</strong><small>{row.dateLabel} · 第 {row.day} 日</small></header><p>{row.detail}</p>{row.person&&getPerson(w,row.person)&&<button onClick={()=>onPerson(row.person!)}>查看 {politicalName(row.person,w)}</button>}</article>)}</div></section>}</>;
}
