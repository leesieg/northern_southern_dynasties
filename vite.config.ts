import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { ProxyAgent } from 'proxy-agent';

const agent = new ProxyAgent();
const tileProxy = {
  '/__atlas/dem': {target:'https://tiles.mapterhorn.com',changeOrigin:true,agent,rewrite:(path:string)=>path.replace(/^\/__atlas\/dem/,'')},
  '/__atlas/vector': {target:'https://tiles.openfreemap.org',changeOrigin:true,agent,rewrite:(path:string)=>path.replace(/^\/__atlas\/vector/,'')},
};

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true, proxy:tileProxy, watch:{ignored:['**/.cache/**']} },
  preview: {proxy:tileProxy},
  build: { rollupOptions: { output: { manualChunks: (id) => id.includes('/node_modules/maplibre-gl/') ? 'maplibre' : undefined } } },
});
