// Recovery must keep failures: Vite can mark a failed CSS preload as already seen.
let styles:Promise<unknown>|undefined;
export function loadGameSkin(){return styles??=import('../ui/gameStyles');}
export function reportGameSkinFailure(error:unknown){
 console.error('Game interface styles failed to load',error);
 const message=document.getElementById('boot-message');
 if(message){message.textContent='游戏界面资源加载失败，请刷新重试。';message.setAttribute('role','alert');}
}
