import {ActionDialog} from './ActionDialog';
import {CharacterPortrait} from './CharacterPortrait';
import {ArtIcon} from './ArtIcon';
import {DialogArt} from './DialogArt';
import {afterCommand} from './actionFeedback';
import {cityYield,fortificationLevel,realmReason,type RealmCommand,type Tax} from '../core/realm';
import {politicalName} from '../core/government';
import {siteById} from '../data/scenario';
import type {World,GameCommand} from '../core/types';
export const taxPresentation:Record<Tax,{name:string;rate:number;order:number}>={light:{name:'轻税',rate:70,order:4},normal:{name:'常税',rate:100,order:1},heavy:{name:'重税',rate:140,order:-6}};
/** Preview calls the real yield formula against a shallow immutable tax draft. */
export function taxPreview(world:World,site:string,tax:Tax){
 const realm=world.realm!;
 const draft={...world,realm:{...realm,cities:{...realm.cities,[site]:{...realm.cities[site],tax}}}};
 return {before:cityYield(world,site).coins,after:cityYield(draft,site).coins};
}
export function CityPolicyDialog({world,command,pending,send,onClose}:{world:World;command:RealmCommand;pending:boolean;send:(c:GameCommand)=>Promise<boolean>;onClose:()=>void}){
 if(!('site' in command)||!['tax','relief','fortify'].includes(command.action))return null;
 const site=command.site,city=world.realm!.cities[site],reason=realmReason(world,command),tax=command.action==='tax'?command.tax:null,quote=tax?taxPreview(world,site,tax):null,level=fortificationLevel(world,site),title=tax?'调整税制':command.action==='relief'?'赈济安民':'修筑城防';
 const scheme=(value:Tax,heading:string)=><section className="city-tax-scheme"><small>{heading}</small><h3>{taxPresentation[value].name}</h3><ArtIcon name="coins" size={48}/><strong>{taxPresentation[value].rate}%</strong><p>秩序 {taxPresentation[value].order>0?'+':''}{taxPresentation[value].order} / 期</p></section>;
 return <ActionDialog title={title} className="city-policy-dialog" art={command.action==='fortify'?'fortress':'realm'} heading={<p>{siteById[site].name} · 由本城官署执行</p>} onClose={onClose} actions={<button className="primary" disabled={pending||!!reason} onClick={()=>{if(pending||realmReason(world,command))return;void afterCommand(send(command),onClose);}}>确认下令</button>}>
 <div className="city-policy-document"><div>{tax?<><div className="city-tax-comparison">{scheme(city.tax,'当前税制')}<span aria-hidden="true">→</span>{scheme(tax,'拟调整为')}</div><section className="city-policy-consequence"><h3>下期税收 · 按当前城况预估</h3><p>{quote!.before.toLocaleString()} → <strong>{quote!.after.toLocaleString()} 钱</strong>（{quote!.after-quote!.before>=0?'+':''}{quote!.after-quote!.before}）</p><p>税制立即调整，税收与秩序按下期规则结算；本次不划转钱粮，税款按现行分成入库。</p></section></>:<><DialogArt scene={command.action==='fortify'?'fortress':'care'} className="city-policy-paint"/><h3>{command.action==='relief'?'开仓赈济':'修缮城垣'}</h3><p>{command.action==='relief'?'消耗本城公粮 50，秩序 +15。都城先用本城仓，不足部分取中央仓。':`由本城公库支出 ${(level+1)*80} 钱，工期 ${(level+1)*30} 日；完工后城防提升一级。`}</p>{command.action==='fortify'&&<p>每级每期维护 2 钱；首都基础一级免维护。未完工时失守会停建。</p>}</>}{reason&&<p role="status" className="service-warning">{reason}</p>}</div><aside><CharacterPortrait characterId={world.characterId!} world={world} compact/><small>下令人</small><h3>{politicalName(world.characterId!,world)}</h3><p>由本城官署执行，不单列人物功绩。</p></aside></div>
 </ActionDialog>;
}
