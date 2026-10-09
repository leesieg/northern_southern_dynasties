import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {relationshipPeople} from '../data/relationships';
import {CharacterPortrait} from './CharacterPortrait';
import {LayeredPortrait} from './LayeredPortrait';
import {portraitContext,officeNames,type PortraitOffice} from '../character/composition';

const people=[...relationshipPeople.map(p=>({id:p.id,name:p.name,realm:p.realm})),{id:'fictional',name:'沈行舟',realm:'liang'}];
function Preview(){
 const [id,setId]=useState('gao-huan');const current=people.find(p=>p.id===id)!;
 const [office,setOffice]=useState<PortraitOffice|'current'>('current');
 const context=portraitContext(id);
 return <><header><p>风云南北朝 · C 线描淡彩</p><h1>人物画卷</h1><p>{people.length} 位人物 · 点击头像查看半身</p><a href="/">进入游戏 →</a></header><main className="roster-review"><section className="roster-faces" aria-label="人物列表">{people.map(p=><button key={p.id} aria-pressed={id===p.id} onClick={()=>setId(p.id)}><CharacterPortrait characterId={p.id} compact/><strong>{p.name}</strong><small>{p.realm==='liang'?'梁':p.realm==='east'?'东魏':'西魏'}</small></button>)}</section><aside><h2>{current.name}</h2><label>服饰预览 <select value={office} onChange={e=>setOffice(e.target.value as PortraitOffice|'current')}><option value="current">开局身份</option>{Object.entries(officeNames).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><p>仅预览服饰，不改变游戏身份。美术效果待人工验收。</p><div className="painted-portrait"><LayeredPortrait characterId={id} name={current.name} context={office==='current'?context:{...context,office}}/></div></aside></main></>;
}
createRoot(document.getElementById('portrait-roster')!).render(<Preview/>);
