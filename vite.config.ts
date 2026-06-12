import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    port: 3000,
    host: true
  },
  build: {
    // element-plus / marked / echarts 等第三方库体积较大，已按库拆包，放宽警告阈值
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@element-plus/icons-vue')) return 'icons'
            if (id.includes('element-plus')) return 'element-plus'
            if (id.includes('vue') || id.includes('pinia')) return 'vue'
            if (id.includes('marked') || id.includes('highlight.js')) return 'markdown'
            if (id.includes('echarts')) return 'charts'
            return 'vendor'
          }
        },
      },
    },
  },
})
