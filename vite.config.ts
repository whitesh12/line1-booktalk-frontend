import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 개발 중 백엔드(Spring, :8080)로 /v1 요청을 넘깁니다.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/v1': 'http://localhost:8080' },
  },
});
