import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios'

import { ElMessage, ElNotification } from 'element-plus'
import qs from 'qs'
import { config } from '@/config/axios/config'
import {
  getAccessToken,
  getRefreshToken,
  getTenantId,
  getVisitTenantId
} from '@/utils/auth'
import errorCode from './errorCode'
import { handle401, handleAuthorized, isRelogin } from './refreshToken'

import { ApiEncrypt } from '@/utils/encrypt'

const tenantEnable = import.meta.env.VITE_APP_TENANT_ENABLE
const { result_code, base_url, request_timeout } = config

// 需要忽略的提示。忽略后，自动 Promise.reject('error')
const ignoreMsgs = [
  '无效的刷新令牌', // 刷新令牌被删除时，不用提示
  '刷新令牌已过期' // 使用刷新令牌，刷新获取新的访问令牌时，结果因为过期失败，此时需要忽略。否则，会导致继续 401，无法跳转到登出界面
]
// 请求白名单，无须 token 的接口
const whiteList: string[] = ['/login', '/refresh-token']

// 创建axios实例
const service: AxiosInstance = axios.create({
  baseURL: base_url, // api 的 base_url
  timeout: request_timeout, // 请求超时时间
  withCredentials: false, // 禁用 Cookie 等信息
  // 自定义参数序列化函数
  paramsSerializer: (params) => {
    return qs.stringify(params, { allowDots: true, arrayFormat: 'repeat' })
  }
})

// request拦截器
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 是否需要设置 token
    let isToken = (config!.headers || {}).isToken === false
    whiteList.some((v) => {
      if (config.url && config.url.indexOf(v) > -1) {
        return (isToken = false)
      }
    })
    if (getAccessToken() && !isToken) {
      config.headers.Authorization = 'Bearer ' + getAccessToken() // 让每个请求携带自定义token
    }
    // 每次请求携带 refreshToken（用于后端识别刷新凭证）
    if (getRefreshToken()) {
      // config.headers['X-Refresh-Token'] = getRefreshToken()
      config.headers['refreshToken'] = getRefreshToken()
    }
    // 设置租户
    if (tenantEnable && tenantEnable === 'true') {
      const tenantId = getTenantId()
      if (tenantId) config.headers['tenant-id'] = tenantId
      // 只有登录时，才设置 visit-tenant-id 访问租户
      const visitTenantId = getVisitTenantId()
      if (config.headers.Authorization && visitTenantId) {
        config.headers['visit-tenant-id'] = visitTenantId
      }
    }
    const method = config.method?.toUpperCase()
    // 防止 GET 请求缓存
    if (method === 'GET') {
      config.headers['Cache-Control'] = 'no-cache'
      config.headers['Pragma'] = 'no-cache'
    }
    // 自定义参数序列化函数
    else if (method === 'POST') {
      const contentType = config.headers['Content-Type'] || config.headers['content-type']
      if (contentType === 'application/x-www-form-urlencoded') {
        if (config.data && typeof config.data !== 'string') {
          config.data = qs.stringify(config.data)
        }
      }
    }
    // 是否 API 加密
    if ((config!.headers || {}).isEncrypt) {
      try {
        // 加密请求数据
        if (config.data) {
          config.data = ApiEncrypt.encryptRequest(config.data)
          // 设置加密标识头
          config.headers[ApiEncrypt.getEncryptHeader()] = 'true'
        }
      } catch (error) {
        console.error('请求数据加密失败:', error)
        throw error
      }
    }
    return config
  },
  (error: AxiosError) => {
    // Do something with request error
    console.log(error) // for debug
    return Promise.reject(error)
  }
)

// response 拦截器
service.interceptors.response.use(
  async (response: AxiosResponse<any>) => {
    let { data } = response
    const config = response.config
    if (!data) {
      // 返回“[HTTP]请求没有返回值”;
      throw new Error()
    }

    // 检查是否需要解密响应数据
    const encryptHeader = ApiEncrypt.getEncryptHeader()
    const isEncryptResponse =
      response.headers[encryptHeader] === 'true' ||
      response.headers[encryptHeader.toLowerCase()] === 'true'
    if (isEncryptResponse && typeof data === 'string') {
      try {
        // 解密响应数据
        data = ApiEncrypt.decryptResponse(data)
      } catch (error) {
        console.error('响应数据解密失败:', error)
        throw new Error('响应数据解密失败: ' + (error as Error).message)
      }
    }

    // 【已删除】T-User 响应头提取逻辑，改为通过 /api/user/info 接口获取用户信息

    const { t } = useI18n()
    // 未设置状态码则默认成功状态
    // 二进制数据则直接返回，例如说 Excel 导出
    if (
      response.request.responseType === 'blob' ||
      response.request.responseType === 'arraybuffer'
    ) {
      // 注意：如果导出的响应为 json，说明可能失败了，不直接返回进行下载
      if (response.data.type !== 'application/json') {
        return response.data
      }
      data = await new Response(response.data).json()
    }
    const code = data.code || result_code
    // 获取错误信息
    const msg = data.msg || errorCode[code] || errorCode['default']
    if (ignoreMsgs.indexOf(msg) !== -1) {
      // 如果是忽略的错误码，直接返回 msg 异常
      return Promise.reject(msg)
    } else if (code === 401) {
      // 访问令牌过期，使用共享刷新逻辑（队列机制避免并发刷新）
      return handle401(config, service)
    } else if (code === 403) {
      // 403：权限被拒绝，不尝试刷新，直接提示重新登录
      return handleAuthorized()
    } else if (code === 500) {
      ElMessage.error(t('sys.api.errMsg500'))
      return Promise.reject(new Error(msg))
    } else if (code === 901) {
      ElMessage.error({
        offset: 300,
        dangerouslyUseHTMLString: true,
        message:
          '<div>' +
          t('sys.api.errMsg901') +
          '</div>' +
          '<div> &nbsp; </div>' +
          '<div>参考 https://doc.iocoder.cn/ 教程</div>' +
          '<div> &nbsp; </div>' +
          '<div>5 分钟搭建本地环境</div>'
      })
      return Promise.reject(new Error(msg))
    } else if (code !== 200 && code !== 0) {
      // 兼容 Java 后端 (code: 0) 和 Node 后端 (code: 200) 的成功码
      if (msg === '无效的刷新令牌') {
        // hard coding：忽略这个提示，直接登出
        console.log(msg)
        return handleAuthorized()
      } else {
        ElNotification.error({ title: msg })
      }
      return Promise.reject('error')
    } else {
      // code === 200 (Node) 或 code === 0 (Java) 都视为成功
      return data
    }
  },
  (error: AxiosError) => {
    // HTTP 状态码级别的 401/403 处理
    const status = error.response?.status
    if (status === 401) {
      // HTTP 401：复用共享刷新逻辑
      const config = error.config
      if (config) {
        return handle401(config, service)
      }
      return handleAuthorized()
    }
    if (status === 403) {
      // HTTP 403：不刷新，直接提示重新登录
      return handleAuthorized()
    }

    console.log('err' + error) // for debug
    let { message } = error
    const { t } = useI18n()
    if (message === 'Network Error') {
      message = t('sys.api.errorMessage')
    } else if (message.includes('timeout')) {
      message = t('sys.api.apiTimeoutMessage')
    } else if (message.includes('Request failed with status code')) {
      message = t('sys.api.apiRequestFailed') + message.substr(message.length - 3)
    }
    ElMessage.error(message)
    return Promise.reject(error)
  }
)

export { service, isRelogin }
