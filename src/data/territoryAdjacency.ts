import territories from './territories.json';

// Shared edges of the existing schematic county map, not reconstructed historical borders.
const neighbors=new Map<string,Set<string>>(territories.features.map(f=>[f.properties.id,new Set<string>()]));
const edgeOwners=new Map<string,string[]>();
for(const feature of territories.features)for(const polygon of feature.geometry.coordinates)for(const ring of polygon)for(let i=1;i<ring.length;i++){
 const a=ring[i-1].map(v=>v.toFixed(8)).join(','),b=ring[i].map(v=>v.toFixed(8)).join(',');if(a===b)continue;
 const edge=[a,b].sort().join('|'),owners=edgeOwners.get(edge)??[],id=feature.properties.id;
 for(const other of owners)if(other!==id){neighbors.get(id)!.add(other);neighbors.get(other)!.add(id);}
 if(!owners.includes(id))owners.push(id);edgeOwners.set(edge,owners);
}
export function territoryNeighbors(id:string):ReadonlySet<string>{return neighbors.get(id)??new Set<string>();}
