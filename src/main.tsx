import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import './ui/style.css';
import './ui/detailScenes.css';

if (import.meta.env.BASE_URL.startsWith('/games/fengyun-nanbeichao/')) {
  let owner: string | undefined;
  const checkAccount=async()=>{
    try {
      const response=await fetch('/agent-api/account',{credentials:'same-origin',cache:'no-store'});
      const current=response.ok?(await response.json() as {user?:{id?:string}}).user?.id??'':'';
      if(owner===undefined)owner=current;
      else if(owner!==current)window.location.replace('/games/');
    } catch { /* A temporary network error must not discard a game in progress. */ }
  };
  void checkAccount();
  window.addEventListener('focus',()=>void checkAccount());
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void checkAccount();});
  window.setInterval(()=>void checkAccount(),15000);
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
