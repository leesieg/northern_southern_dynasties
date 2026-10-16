import {LAUNCH_KEY,type ContentContext} from './contentContext';
/** Restore the exact checkpoint, including days not in the old manual slot. */
export async function cancelContentLaunch(ctx:ContentContext,session:Pick<Storage,'getItem'|'setItem'|'removeItem'>=sessionStorage){
 const id=session.getItem(LAUNCH_KEY);let launch;try{launch=id?await ctx.library.launch(id):undefined;}catch(e){if(e instanceof Error&&e.name==='ContentScopeError'){session.removeItem(LAUNCH_KEY);ctx.launch=undefined;return;}throw e;}
 if(launch?.rollback){const {text}=launch.rollback,content=await ctx.library.resolve(text),replacement={id:crypto.randomUUID(),digest:content.digest,request:{type:'import' as const,text}};await ctx.library.stage(replacement);try{session.setItem(LAUNCH_KEY,replacement.id);}catch(e){await ctx.library.clearLaunch(replacement.id);throw e;}}
 else session.removeItem(LAUNCH_KEY);
 if(id)await ctx.library.clearLaunch(id);ctx.launch=undefined;
}
