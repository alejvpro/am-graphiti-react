import { defineConfig } from 'vitest/config';
import {loadEnv} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({mode})=>({ base:loadEnv(mode,'.','').VITE_BASE_PATH||'/react-preview/', plugins: [react()], test: { environment: 'jsdom', setupFiles: './tests/setup.ts', include: ['tests/**/*.test.ts*'] } }));
