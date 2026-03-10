// ============================================
// 打字肉鸽 - Web Demo 构建配置
// ============================================
// Tech-Spec: Web Demo 浏览器试玩版 - Task 1

import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  // 使用相对路径，确保 itch.io iframe 等非根路径环境正常加载
  base: './',
  // root 默认为 cwd (src/)，index.html 在 src/index.html
  build: {
    outDir: resolve(__dirname, '../dist-web'),
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
    __APP_VERSION__: JSON.stringify('demo'),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
    __GIT_COMMIT__: JSON.stringify('demo'),
    __DEMO_MODE__: JSON.stringify(true)
  }
})
