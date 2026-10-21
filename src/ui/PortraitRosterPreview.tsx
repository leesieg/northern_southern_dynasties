import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {relationshipPeople} from '../data/relationships';
import {familyPeople} from '../data/families';
import {historicalPortraitRegistration} from '../character/historicalPortrait';
import {CharacterPortrait} from './CharacterPortrait';
import {LayeredPortrait} from './LayeredPortrait';
import {portraitContext,officeNames,type PortraitOffice} from '../character/composition';

const people=[...relationshipPeople.map(p=>({id:p.id,name:p.name,realm:p.realm})),...familyPeople.filter(p=>p.status==='ancestor'&&Object.hasOwn(historicalPortraitRegistration,p.id)).map(p=>({id:p.id,name:p.name,realm:'ancestor'})),{id:'fictional',name:'沈行舟',realm:'liang'}];
function Preview(){
 const [id,setId]=useState('gao-huan');const current=people.find(p=>p.id===id)!;
 const [office,setOffice]=useState<PortraitOffice|'current'>('current');const [age,setAge]=useState<number>();
 const original=portraitContext(id),context=age===undefined?original:{...original,life:{baselineAge:age,sickness:0 as const,deceased:false,...original.life,age}};
 return <><header><p>风云南北朝 · C 线描淡彩</p><h1>人物画卷</h1><p>{people.length} 位人物 · 点击头像查看半身</p><a href="/">进入游戏 →</a></header>
 <main className="roster-review"><section className="roster-faces" aria-label="人物列表">{people.map(p=><button key={p.id} aria-pressed={id===p.id} onClick={()=>{setId(p.id);setAge(undefined);}}><CharacterPortrait characterId={p.id} name={p.name} compact/><strong>{p.name}</strong><small>{p.realm==='liang'?'梁':p.realm==='east'?'东魏':p.realm==='ancestor'?'先人':'西魏'}</small></button>)}</section>
 <aside><h2>{current.name}</h2><label>服饰预览 <select value={office} onChange={e=>setOffice(e.target.value as PortraitOffice|'current')}><option value="current">开局身份</option>{Object.entries(officeNames).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
 <label>年龄预览 <input type="number" min={0} max={120} value={age??original.life?.age??18} onChange={e=>{const n=e.target.valueAsNumber;if(Number.isFinite(n))setAge(Math.max(0,Math.min(120,n)));}}/></label>
 <p>仅预览外观，不改变游戏年龄或身份。未成年使用对应年龄衣装，成年后按身份换装。美术效果待人工验收。</p><div className="painted-portrait"><LayeredPortrait characterId={id} name={current.name} context={office==='current'?context:{...context,office}}/></div></aside></main></>;
}
createRoot(document.getElementById('portrait-roster')!).render(<Preview/>);
