import {compileOfficialPackage,projectRoot} from './contentPackageCompiler.mjs';
/** Lazy compilation also works in the independent Vite worker plugin pipeline. */
export function contentPackagePlugin(){
 let compiled;
 return {name:'fynbc-content-package',resolveId(id){if(id==='virtual:official-content-package')return '\0'+id;},
  async load(id){if(id!=='\0virtual:official-content-package')return;compiled??=compileOfficialPackage();const value=await compiled;return 'export default '+JSON.stringify(value)+';';},
  handleHotUpdate(context){
   if(!context.file.startsWith(projectRoot))return;
   const path=context.file.slice(projectRoot.length);
   if(!/^(src\/(core|data|worker)\/|public\/|scripts\/contentPackage|package-lock\.json)/.test(path))return;
   compiled=undefined;
   const module=context.server.moduleGraph.getModuleById('\0virtual:official-content-package');
   if(module){context.server.moduleGraph.invalidateModule(module);return [...context.modules,module];}
  },
 };
}
