import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import {newCampaignWorld} from '../../../../src/core/world';
import {WarDetailsDialog} from '../../../../src/ui/WarDetails';
import {ArmyDeploymentDialog} from '../../../../src/ui/ArmyDeploymentDialog';
import {MilitaryChoiceDialog} from '../../../../src/ui/MilitaryChoiceDialog';
import {RecruitmentPlanDialog} from '../../../../src/ui/RecruitmentPlanDialog';
import {ActionDialog} from '../../../../src/ui/ActionDialog';
import {PauseDialog} from '../../../../src/ui/PauseDialog';
import {CombatDetails} from '../../../../src/ui/CombatDetails';
import {PersonSelectionDialog} from '../../../../src/ui/PersonSelection';
import {CustodyPerson} from '../../../../src/ui/CustodyPanel';
import {NobilityPanel} from '../../../../src/ui/PoliticalIdentity';
import {PopulationPanel} from '../../../../src/ui/PopulationPanel';
import {ensurePowerPolitics} from '../../../../src/core/powerPolitics';
import {allPeople} from '../../../../src/core/personRegistry';
import '../../../../src/ui/App';
import '../../../../src/ui/style.css';
import '../../../../src/ui/detailScenes.css';
import '../../../../src/ui/terrainScene.css';
import '../../../../src/ui/campaignSetup.css';
import '../../../../src/ui/experience.css';
import '../../../../src/ui/decisionPresentation.css';
import '../../../../src/ui/immersiveInterface.css';
import '../../../../src/ui/dialogDesign.css';
import '../../../../src/ui/identityCityDesign.css';
import '../../../../src/ui/typography.css';
import '../../../../src/ui/courtyardMenu.css';

// Local, non-persistent fixtures exercise the actual production components.
// No worker, save API, game clock or command execution is connected.
function Preview(){
 const [page,setPage]=useState('war'),[person,setPerson]=useState('xiao-gang'),[notice,setNotice]=useState('');
 const [world]=useState(()=>{const w=newCampaignWorld('xiao-yan',undefined,'sandbox');w.day=30;ensurePowerPolitics(w).reassessments=[{realm:"liang",person:"xiao-yan",day:30,from:"xiao-yan",to:"xiao-gang",choice:"pending",jurisdictions:[],armies:[]}];w.realm!.wars=[{id:1,attacker:'liang',defender:'east',target:'luoyang',started:0,score:28,casualties:{attack:1139,defend:1427}}];w.realm!.armies=[{id:1,realm:'liang',location:'jiankang',troops:800,morale:80,supply:200,siege:0,journey:null},{id:2,realm:'liang',location:'jingkou',troops:600,morale:70,supply:150,siege:0,journey:null},{id:3,realm:'east',location:'luoyang',troops:1800,morale:80,supply:200,siege:0,journey:null}];w.militaryAftermath={nextId:2,pools:[],battles:[{id:1,war:1,site:'luoyang',key:'1|luoyang',day:20,last:25,round:6,stage:'clash',a:1,b:3,lossA:36,lossB:44,ended:25,winner:'attack',scoreDelta:3,participants:[{side:'attack',army:1,realm:'liang',commander:'xiao-yan',troops:800},{side:'defend',army:3,realm:'east',commander:null,troops:1800}],losses:{1:36,3:44},fates:{'xiao-yan':'escaped'}}],spoils:[],intel:{},discipline:{},lastDay:29};return w;});
 const close=()=>setPage(''),send=async()=>{setNotice('隔离校验：操作未提交，不连接存档。');return false;},props={world,pending:false,send,onPerson:()=>{}};
 return <div className="focused-shell" style={{minHeight:'100vh',background:'#768272',padding:20}}><nav style={{display:'flex',gap:8,flexWrap:'wrap'}}>{Object.entries({war:'战争三页',battle:'战役结果通知',combat:'战役详情',recruit:'征募',deployment:'联合军令',supply:'军需',selection:'铨选',custody:'人物处置',noble:'册封',migration:'迁运',event:'政治站队',arrival:'抵达通知'}).map(([id,label])=><button key={id} onClick={()=>setPage(id)}>{label}</button>)}</nav><p>实组件隔离校验 · 示例世界，非当前存档；点击确认不会执行命令。</p><p role="status">{notice}</p>
 {page==='war'&&<WarDetailsDialog {...props} warId={1} onClose={close}/>}
 {page==='battle'&&<PauseDialog {...props} count={1} onClose={close} onNavigate={close} event={{id:'fixture-battle',kind:'battle',title:'洛阳之战结束',body:'隔离战报样例，不连接正式存档。',battle:world.militaryAftermath!.battles[0]}}/>}
 {page==='combat'&&<CombatDetails world={world} selected={{kind:'battle',key:'id:1'}} onClose={close}/>}
 {page==='recruit'&&<RecruitmentPlanDialog {...props} onClose={close}/>}
 {page==='deployment'&&<ArmyDeploymentDialog {...props} onClose={close}/>}
 {page==='supply'&&<MilitaryChoiceDialog {...props} choice={{kind:'supplyPolicy'}} onClose={close}/>}
 {page==='selection'&&<PersonSelectionDialog world={world} title="铨选承办人" options={allPeople(world).slice(0,35).map(p=>({id:p.id}))} value={person} onSelect={setPerson} onClose={close} onConfirm={()=>setNotice('候选只选入隔离草稿')}/>}
 {page==='custody'&&<ActionDialog art="custody" title="处置入口" onClose={close} actions={null}><CustodyPerson {...props} person="xiao-gang"/></ActionDialog>}
 {page==='noble'&&<ActionDialog art="rites" title="册封入口" onClose={close} actions={null}><NobilityPanel {...props}/></ActionDialog>}
 {page==='migration'&&<ActionDialog art="migration" title="迁运入口" onClose={close} actions={null}><PopulationPanel {...props} site="jiankang"/></ActionDialog>}
 {page==='event'&&<PauseDialog {...props} count={1} onClose={close} onNavigate={close} event={{id:'fixture-stance',kind:'allegiance',allegianceRealm:'liang',title:'新朝统属',body:'此页仅用于校验选择与最终确认的布局。'}}/>}
 {page==='arrival'&&<PauseDialog {...props} count={1} onClose={close} onNavigate={close} event={{id:'fixture-arrival',kind:'arrival',site:'jiankang',title:'抵达建康',body:'已抵达目的地。此页是隔离样例，未推进正式存档。'}}/>}
 </div>;
}
if(location.hostname==='127.0.0.1'||location.hostname==='localhost'){
 const root=import.meta.hot?.data.root??createRoot(document.getElementById('root')!);
 if(import.meta.hot)import.meta.hot.data.root=root;
 root.render(<Preview/>);
}
