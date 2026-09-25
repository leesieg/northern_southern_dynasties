import {it,expect} from 'vitest';
import {roads,sites,siteById} from '../data/scenario';
import {planRoute,distanceBetween} from './world';
// Preserve the previous route and tie-breaking contract while indexing static road topology.
function reference(from:string,to:string,allowed:(id:string)=>boolean){
 const costs:Record<string,number>={[from]:0},previous:Record<string,string>={},pending=new Set(sites.map(s=>s.id));
 while(pending.size){const current=[...pending].sort((a,b)=>(costs[a]??Infinity)-(costs[b]??Infinity))[0];if(costs[current]===undefined)return null;
 if(current===to){const route=[to];while(route[0]!==from)route.unshift(previous[route[0]]);return {route,days:costs[to]};}
 pending.delete(current);for(const edge of roads){const next=edge.from===current?edge.to:edge.to===current?edge.from:null;if(!next||!pending.has(next)||!allowed(next))continue;
 const cost=costs[current]+Math.max(1,Math.ceil(distanceBetween(current,next)*edge.factor/40));if(cost<(costs[next]??Infinity)){costs[next]=cost;previous[next]=current;}}
 }return null;
}
it('indexed routes retain travel days, stable ties and live border filtering',()=>{
 const sample=sites.filter((_,i)=>i%37===0);
 for(const from of sample)for(const to of sample){if(from.id===to.id)continue;
 for(const allowed of [()=>true,(id:string)=>siteById[id].polity===from.polity]){
 const expected=reference(from.id,to.id,allowed),actual=planRoute(from.id,to.id,allowed);
 expect(actual?{route:actual.route,days:actual.days}:null).toEqual(expected);
 }}
});
