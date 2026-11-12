import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/browser',
 use:{baseURL:'http://127.0.0.1:5173/react-preview/',launchOptions:{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}},
 webServer:[
  {command:'npm run dev -- --port 5173 --strictPort',url:'http://127.0.0.1:5173/react-preview/',reuseExistingServer:false,env:{VITE_PLAYBACK_MODE:'sample',VITE_BASE_PATH:'/react-preview/'}},
  {command:'npm run dev -- --port 5174 --strictPort',url:'http://127.0.0.1:5174/react-preview/',reuseExistingServer:false,env:{VITE_PLAYBACK_MODE:'read-only',VITE_BASE_PATH:'/react-preview/',VITE_LASTFM_USERNAME:'fixture-user',VITE_LASTFM_API_KEY:'fixture-public-key',VITE_MAC_ROUTE:'internal',VITE_MAC_INTERNAL_ORIGIN:'http://mac-lan.example.invalid:7305',VITE_MAC_EXTERNAL_ORIGIN:'http://mac-public.example.invalid:7305',VITE_MAC_LOCAL_ORIGIN:''}},
  {command:'npm run preview -- --port 4173 --strictPort',url:'http://127.0.0.1:4173/react-preview/',reuseExistingServer:false}
 ],reporter:'list'
});
