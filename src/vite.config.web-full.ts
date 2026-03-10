// ============================================
// 打字肉鸽 - Web 完整版构建配置（开发用）
// ============================================

import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: './',
  build: {
    outDir: resolve(__dirname, '../dist-web-full'),
    emptyOutDir: true,
    rollupOptions: {
      input: { index: resolve(__dirname, 'index.html') }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@renderer': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, 'shared')
    }
  },
  define: {
    __APP_VERSION__: JSON.stringify('dev'),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
    __GIT_COMMIT__: JSON.stringify('dev'),
    __DEMO_MODE__: JSON.stringify(false)
  }
})
