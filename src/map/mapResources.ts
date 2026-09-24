// Only local previews use the fixed-provider relay. Published static builds use provider URLs.
export function mapResourceUrl(url:string,origin:string):string {
  const local=new URL(origin);
  if(!['127.0.0.1','localhost','[::1]'].includes(local.hostname))return url;
  const resource=new URL(url,origin);
  if(resource.protocol!=='https:')return url;
  if(resource.hostname==='tiles.mapterhorn.com')return `${origin}/__atlas/dem${resource.pathname}${resource.search}`;
  if(resource.hostname==='tiles.openfreemap.org')return `${origin}/__atlas/vector${resource.pathname}${resource.search}`;
  return url;
}
