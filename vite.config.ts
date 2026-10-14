import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { ProxyAgent } from 'proxy-agent';
import {mapResourcesPlugin} from './scripts/mapResourcesPlugin.mjs';
import {studioPlugin} from './scripts/studioPlugin.mjs';
import {contentPackagePlugin} from './scripts/contentPackagePlugin.mjs';

const agent = new ProxyAgent();
const tileProxy = {
  '/__atlas/dem': {target:'https://tiles.mapterhorn.com',changeOrigin:true,agent,rewrite:(path:string)=>path.replace(/^\/__atlas\/dem/,'')},
  '/__atlas/vector': {target:'https://tiles.openfreemap.org',changeOrigin:true,agent,rewrite:(path:string)=>path.replace(/^\/__atlas\/vector/,'')},
};

export default defineConfig({
  plugins: [react(),mapResourcesPlugin(),contentPackagePlugin(),studioPlugin()],
  worker:{format:'es',plugins:()=>[contentPackagePlugin()]},
  server: { port: 5173, strictPort: true, proxy:tileProxy, fs:{deny:['**/.studio/**','**/.env*','**/*.{crt,pem}','**/.git/**']}, watch:{ignored:['**/.cache/**','**/.studio/**']} },
  preview: {proxy:tileProxy},
  build: { rollupOptions: { input:{studio:'studio.html',game:'index.html',mapSample:'map-sample.html',mapArtSample:'map-art-sample.html'},output: { manualChunks: (id) => id.includes('/node_modules/maplibre-gl/') ? 'maplibre' : undefined } } },
});
