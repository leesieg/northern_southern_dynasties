import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {relationshipPeople} from '../data/relationships';
import {CharacterPortrait} from './CharacterPortrait';

const people=[...relationshipPeople.map(p=>({id:p.id,name:p.name,realm:p.realm})),{id:'fictional',name:'沈行舟',realm:'liang'}];
function Preview(){
 const [id,setId]=useState('gao-huan');const current=people.find(p=>p.id===id)!;
 return <><header><p>风云南北朝 · C 线描淡彩</p><h1>人物画卷</h1><p>{people.length} 位人物 · 点击头像查看半身</p><a href="/">进入游戏 →</a></header><main className="roster-review"><section className="roster-faces" aria-label="人物列表">{people.map(p=><button key={p.id} aria-pressed={id===p.id} onClick={()=>setId(p.id)}><CharacterPortrait characterId={p.id} compact/><strong>{p.name}</strong><small>{p.realm==='liang'?'梁':p.realm==='east'?'东魏':'西魏'}</small></button>)}</section><aside><h2>{current.name}</h2><CharacterPortrait characterId={id}/></aside></main></>;
}
createRoot(document.getElementById('portrait-roster')!).render(<Preview/>);
