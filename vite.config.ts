import { resolve } from 'path'
import type { ConfigEnv, UserConfig } from 'vite'
import { loadEnv } from 'vite'
import { createVitePlugins } from './build/vite'
import { exclude, include } from "./build/vite/optimize"
// 当前执行node命令时文件夹的地址(工作目录)
const root = process.cwd()

// 路径查找
function pathResolve(dir: string) {
  return resolve(root, '.', dir)
}

// https://vitejs.dev/config/
export default ({ command, mode }: ConfigEnv): UserConfig => {
  let env = {} as any
  const isBuild = command === 'build'
  if (!isBuild) {
    env = loadEnv((process.argv[3] === '--mode' ? process.argv[4] : process.argv[3]), root)
  } else {
    env = loadEnv(mode, root)
  }
  return {
    base: env.VITE_BASE_PATH,
    root: root,
    // 服务端渲染
    server: {
      port: env.VITE_PORT, // 端口号
      host: "0.0.0.0",
      open: env.VITE_OPEN === 'true',
      // 本地跨域代理. 目前注释的原因：暂时没有用途，server 端已经支持跨域
      // proxy: {
      //   ['/admin-api']: {
      //     target: env.VITE_BASE_URL,
      //     ws: false,
      //     changeOrigin: true,
      //     rewrite: (path) => path.replace(new RegExp(`^/admin-api`), ''),
      //   },
      // },
      proxy: {
        '/api': {
          target: env.VITE_BACKEND_TYPE === 'node'
            ? (env.VITE_NODE_API_URL || 'http://localhost:8080')
            : (env.VITE_JAVA_API_URL || 'http://192.168.20.199:8081'),
          changeOrigin: true,
          // ===== 后端已统一 /api 前缀，无需 strip =====
          // rewrite: (path) => path.replace(/^\/api/, ''),
          configure: (proxy, options) => {
            const backendType = env.VITE_BACKEND_TYPE || 'node'
            proxy.on('proxyReq', (proxyReq, req) => {
              console.log(`[Proxy:${backendType}] ${req.method} ${req.url} -> ${options.target}${proxyReq.path}`)
            })
            proxy.on('error', (err) => {
              console.error('[Proxy Error]', err.message)
            })
          }
        }
      }
    },
    // 项目使用的vite插件。 单独提取到build/vite/plugin中管理
    plugins: createVitePlugins(),
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "@/styles/variables.scss" as *;',
          javascriptEnabled: true,
          silenceDeprecations: ["legacy-js-api"], // 参考自 https://stackoverflow.com/questions/78997907/the-legacy-js-api-is-deprecated-and-will-be-removed-in-dart-sass-2-0-0
        }
      }
    },
    resolve: {
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.scss', '.css'],
      alias: [
        {
          find: 'vue-i18n',
          replacement: 'vue-i18n/dist/vue-i18n.cjs.js'
        },
        {
          find: 'events',
          replacement: 'events'
        },
        {
          find: /\@\//,
          replacement: `${pathResolve('src')}/`
        }
      ]
    },
    define: {
      'import.meta.env.VITE_BASE_URL': JSON.stringify(env.VITE_BASE_URL ?? ''),
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || '/api'),
      'import.meta.env.VITE_WS_URL': JSON.stringify(env.VITE_WS_URL || 'ws://localhost:3001')
    },
    worker: {
      format: 'es'
    },
    build: {
      minify: 'terser',
      outDir: env.VITE_OUT_DIR || 'dist',
      sourcemap: env.VITE_SOURCEMAP === 'true' ? 'inline' : false,
      // brotliSize: false,
      chunkSizeWarningLimit: 1500, // 提高 chunk 大小警告限制
      terserOptions: {
        compress: {
          drop_debugger: env.VITE_DROP_DEBUGGER === 'true',
          drop_console: env.VITE_DROP_CONSOLE === 'true'
        }
      },
      rollupOptions: {
        output: {
          manualChunks: {
            echarts: ['echarts'], // 将 echarts 单独打包，参考 https://gitee.com/yudaocode/yudao-ui-admin-vue3/issues/IAB1SX 讨论
            'form-create': ['@form-create/element-ui'], // 参考 https://github.com/yudaocode/yudao-ui-admin-vue3/issues/148 讨论
            'form-designer': ['@form-create/designer']
          }
        }
      }
    },
    optimizeDeps: { include, exclude }
  }
}
