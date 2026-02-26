/**
 * Java 后端 API 请求服务
 * 用于直接调用 Java 后端接口，绕过 collaborative-middleware 中间件
 */
import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import qs from 'qs'
import { getAccessToken, getRefreshToken } from '@/utils/auth'
import { handle401, handleAuthorized } from './refreshToken'

/**
 * 获取 Java API 的 baseURL
 * - 开发环境：使用 /api 前缀，通过 Vite 代理转发（避免跨域）
 * - 生产环境：
 *   - 同域部署（Nginx 代理）：使用 /api
 *   - 跨域部署（后端配置 CORS）：使用完整 URL
 *
 * 通过 VITE_USE_PROXY 环境变量控制：
 * - true（默认）: 使用代理路径 /api
 * - false: 使用完整 URL（需后端配置 CORS）
 */
const getJavaBaseUrl = (): string => {
  // 检查是否使用代理模式（默认使用代理）
  const useProxy = import.meta.env.VITE_USE_PROXY !== 'false'

  if (useProxy) {
    // 开发环境 Vite 代理 / 生产环境 Nginx 代理
    return '/api'
  }

  // 直接请求后端（需后端配置 CORS）— Java 后端无 /api 前缀，直连裸路径
  //return import.meta.env.VITE_JAVA_API_URL || 'http://192.168.20.199:8081'
  // 直接请求后端（需后端配置 CORS）— Java 后端统一 /api 前缀
  return (import.meta.env.VITE_JAVA_API_URL || 'http://192.168.20.199:8081') + '/api'
}

// Java 后端配置
const javaConfig = {
  // Java 后端 API 地址（开发环境走代理）
  base_url: getJavaBaseUrl(),
  // 请求超时时间
  request_timeout: 30000,
  // 文件上传超时时间
  upload_timeout: 60000
}

// 打印配置信息（帮助调试）
if (import.meta.env.DEV) {
  const useProxy = import.meta.env.VITE_USE_PROXY !== 'false'
  console.log(
    `%c[Java Service] baseURL: ${javaConfig.base_url}`,
    'color: #E6A23C; font-weight: bold;'
  )
  console.log(
    `%c[Java Service] 模式: ${useProxy ? '代理模式 (Vite/Nginx)' : '直连模式 (需CORS)'}`,
    'color: #67C23A;'
  )
}

/**
 * 创建 Java API axios 实例
 */
const javaService: AxiosInstance = axios.create({
  baseURL: javaConfig.base_url,
  timeout: javaConfig.request_timeout,
  withCredentials: false,
  // 自定义参数序列化函数
  paramsSerializer: (params) => {
    return qs.stringify(params, { allowDots: true, arrayFormat: 'repeat' })
  }
})

// 请求拦截器
javaService.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 添加 token 到请求头
    const accessToken = getAccessToken()
    if (accessToken) {
      config.headers.Authorization = 'Bearer ' + accessToken
    }
    // 每次请求携带 refreshToken（用于后端识别刷新凭证）
    const refreshToken = getRefreshToken()
    if (refreshToken) {
      // config.headers['X-Refresh-Token'] = refreshToken
      config.headers['refreshToken'] = refreshToken
    }

    const method = config.method?.toUpperCase()

    // 防止 GET 请求缓存
    if (method === 'GET') {
      config.headers['Cache-Control'] = 'no-cache'
      config.headers['Pragma'] = 'no-cache'
    }

    // POST 请求处理
    if (method === 'POST') {
      const contentType = config.headers['Content-Type'] || config.headers['content-type']
      if (contentType === 'application/x-www-form-urlencoded') {
        if (config.data && typeof config.data !== 'string') {
          config.data = qs.stringify(config.data)
        }
      }
    }

    return config
  },
  (error) => {
    console.error('Java API 请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
javaService.interceptors.response.use(
  async (response: AxiosResponse<any>) => {
    const { data } = response

    // 二进制数据直接返回（文件下载）
    if (
      response.request.responseType === 'blob' ||
      response.request.responseType === 'arraybuffer'
    ) {
      // 如果响应是 JSON 格式，说明可能是错误响应
      if (response.data.type === 'application/json') {
        const jsonData = await new Response(response.data).json()
        if (jsonData.code !== 200 && jsonData.code !== 0) {
          ElMessage.error(jsonData.msg || '请求失败')
          return Promise.reject(new Error(jsonData.msg || '请求失败'))
        }
        return jsonData
      }
      return response.data
    }

    // 处理标准 JSON 响应
    if (!data) {
      return Promise.reject(new Error('请求没有返回值'))
    }

    // Java 后端标准响应格式: { code: 200, data: ..., msg: '...' }
    const code = data.code
    const msg = data.msg || data.message || '请求失败'

    if (code === 200 || code === 0) {
      // 成功响应
      return data
    } else if (code === 401) {
      // 访问令牌过期，使用共享刷新逻辑
      return handle401(response.config, javaService)
    } else if (code === 403) {
      // 权限被拒绝，不刷新，直接提示重新登录
      return handleAuthorized()
    } else if (code === 500) {
      ElMessage.error(msg)
      return Promise.reject(new Error(msg))
    } else if (code !== undefined && code !== 200) {
      // 其他错误码
      ElMessage.error(msg)
      return Promise.reject(new Error(msg))
    }

    // 没有 code 字段，直接返回 data
    return data
  },
  (error) => {
    // HTTP 状态码级别的 401/403 处理
    const status = error.response?.status
    if (status === 401) {
      const config = error.config
      if (config) {
        return handle401(config, javaService)
      }
      return handleAuthorized()
    }
    if (status === 403) {
      return handleAuthorized()
    }
    if (status === 405) {
      // HTTP 405：可能是代理/路由异常导致方法不匹配，引导重新登录
      return handleAuthorized()
    }

    console.error('Java API 响应错误:', error)
    let message = error.message || '请求失败'

    if (message === 'Network Error') {
      message = '网络连接异常'
    } else if (message.includes('timeout')) {
      message = '请求超时'
    } else if (message.includes('Request failed with status code')) {
      const statusCode = message.substr(message.length - 3)
      message = `请求失败，状态码: ${statusCode}`
    }

    ElMessage.error(message)
    return Promise.reject(error)
  }
)

/**
 * Java API 请求封装
 */
const javaRequest = {
  /**
   * GET 请求
   */
  get: async <T = any>(url: string, params?: any, config?: any): Promise<T> => {
    const res = await javaService.get(url, { params, ...config })
    return res.data as T
  },

  /**
   * POST 请求
   */
  post: async <T = any>(url: string, data?: any, config?: any): Promise<T> => {
    const res = await javaService.post(url, data, {
      headers: { 'Content-Type': 'application/json' },
      ...config
    })
    return res.data as T
  },

  /**
   * POST 请求 - 返回原始响应（包含 code, data, msg）
   */
  postOriginal: async <T = any>(url: string, data?: any, config?: any): Promise<T> => {
    const res = await javaService.post(url, data, {
      headers: { 'Content-Type': 'application/json' },
      ...config
    })
    return res as unknown as T
  },

  /**
   * DELETE 请求
   */
  delete: async <T = any>(url: string, data?: any, config?: any): Promise<T> => {
    const res = await javaService.delete(url, { data, ...config })
    return res.data as T
  },

  /**
   * PUT 请求
   */
  put: async <T = any>(url: string, data?: any, config?: any): Promise<T> => {
    const res = await javaService.put(url, data, {
      headers: { 'Content-Type': 'application/json' },
      ...config
    })
    return res.data as T
  },

  /**
   * 文件下载 (GET)
   */
  download: async (url: string, params?: any, config?: any): Promise<Blob> => {
    const res = await javaService.get(url, {
      params,
      responseType: 'blob',
      timeout: javaConfig.upload_timeout,
      ...config
    })
    return res as unknown as Blob
  },

  /**
   * 文件下载 (arraybuffer)
   */
  downloadArrayBuffer: async (url: string, params?: any, config?: any): Promise<ArrayBuffer> => {
    const res = await javaService.get(url, {
      params,
      responseType: 'arraybuffer',
      timeout: javaConfig.upload_timeout,
      ...config
    })
    return res as unknown as ArrayBuffer
  },

  /**
   * 文件上传 (FormData)
   */
  upload: async <T = any>(url: string, formData: FormData, config?: any): Promise<T> => {
    const res = await javaService.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: javaConfig.upload_timeout,
      ...config
    })
    return res as unknown as T
  }
}

export { javaService, javaRequest, javaConfig }
export default javaRequest
