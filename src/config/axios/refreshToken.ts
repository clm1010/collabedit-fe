/**
 * 共享的 Token 刷新逻辑
 * 供 service.ts 和 javaService.ts 共同使用，避免并发刷新冲突
 *
 * 核心机制：
 * - 单一刷新状态（isRefreshToken）确保同一时刻只有一个刷新请求
 * - 请求队列（requestList）在刷新期间暂存后续请求，刷新完成后统一回放
 * - 后端类型感知（VITE_BACKEND_TYPE）自动选择 Java/Node 刷新接口
 */
import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import { ElMessageBox } from 'element-plus'
import { config } from '@/config/axios/config'
import {
  getAccessToken,
  getRefreshToken,
  getTenantId,
  removeToken,
  setToken,
  isExternalTokenMode
} from '@/utils/auth'
import { resetRouter } from '@/router'
import { deleteUserCache } from '@/hooks/web/useCache'
import { useExternalUserStoreWithOut } from '@/store/modules/externalUser'
import { useCollaborationUserStoreWithOut } from '@/store/modules/collaborationUser'

const { base_url } = config

// ========== 共享状态 ==========

/** 请求队列（等待刷新完成后回放或拒绝） */
let requestList: { resolve: (value: any) => void; reject: (reason: any) => void }[] = []

/** 是否正在刷新中 */
let isRefreshToken = false

/** 是否显示重新登录弹窗 */
export const isRelogin = { show: false }

// ========== 后端类型感知的刷新 URL ==========

const backendType = import.meta.env.VITE_BACKEND_TYPE || 'node'

const REFRESH_TOKEN_URL: Record<string, string> = {
  java: '/sjrh/permission/refreshToken',
  node: '/system/auth/refresh-token'
}

/**
 * 调用刷新 Token 接口
 * 使用原生 axios（不经过拦截器），避免递归触发 401 处理
 */
const doRefreshToken = async () => {
  axios.defaults.headers.common['tenant-id'] = getTenantId()
  const refreshUrl = REFRESH_TOKEN_URL[backendType] || REFRESH_TOKEN_URL.node
  const url = base_url + refreshUrl + '?refreshToken=' + getRefreshToken()
  // Java 后端刷新接口只接受 GET，Node 后端接受 POST
  if (backendType === 'java') {
    return await axios.get(url)
  }
  return await axios.post(url)
}

/**
 * 处理 401 错误（body code 或 HTTP status 均适用）
 * 共享队列机制，确保只有一个刷新请求在飞
 *
 * @param originalConfig 原始请求配置
 * @param axiosInstance 用于重试的 axios 实例（service 或 javaService）
 * @returns 重试请求的结果 或 reject
 */
export async function handle401(
  originalConfig: InternalAxiosRequestConfig,
  axiosInstance: AxiosInstance
): Promise<any> {
  if (!isRefreshToken) {
    isRefreshToken = true
    // 1. 如果获取不到刷新令牌，则只能执行登出操作
    if (!getRefreshToken()) {
      return handleAuthorized()
    }
    // 2. 进行刷新访问令牌
    try {
      const refreshTokenRes = await doRefreshToken()
      const resData = refreshTokenRes.data
      // 2.1 校验业务状态码（兼容 Java code:0 和 Node code:200）
      if (resData.code !== 200 && resData.code !== 0) {
        throw new Error(resData.msg || resData.message || '刷新令牌失败')
      }
      // 2.2 刷新成功，回放队列 + 当前请求
      setToken(resData.data)
      originalConfig.headers!.Authorization = 'Bearer ' + getAccessToken()
      requestList.forEach(({ resolve }) => {
        resolve(undefined) // 触发队列中的 resolve，由入队处重新发请求
      })
      requestList = []
      return axiosInstance(originalConfig)
    } catch (e) {
      // 2.3 刷新失败，拒绝队列中所有请求（不再用失效 token 重试）
      requestList.forEach(({ reject }) => reject(new Error('刷新令牌失败')))
      // 提示登出。不回放当前请求，避免递归
      return handleAuthorized()
    } finally {
      requestList = []
      isRefreshToken = false
    }
  } else {
    // 已有刷新在进行，添加到队列等待
    return new Promise((resolve, reject) => {
      requestList.push({
        resolve: () => {
          originalConfig.headers!.Authorization = 'Bearer ' + getAccessToken()
          resolve(axiosInstance(originalConfig))
        },
        reject
      })
    })
  }
}

/**
 * 处理登出/重新登录
 * - 外部Token模式：清除用户信息，提示从外部系统重新进入
 * - 标准登录模式：提示重新登录
 */
export const handleAuthorized = () => {
  const { t } = useI18n()

  // 外部Token模式下，同步清除用户信息（包括协作用户）
  if (isExternalTokenMode()) {
    const externalUserStore = useExternalUserStoreWithOut()
    externalUserStore.clearUser()
    const collaborationUserStore = useCollaborationUserStoreWithOut()
    collaborationUserStore.clearUser()
  }

  if (!isRelogin.show) {
    // 如果已经到登录页面则不进行弹窗提示
    if (window.location.href.includes('login')) {
      return
    }
    isRelogin.show = true

    if (isExternalTokenMode()) {
      // 外部Token模式：专用提示（不提供重新登录按钮，需从外部系统重新进入）
      ElMessageBox.alert('访问凭证已过期，请从外部系统重新进入', '会话过期', {
        confirmButtonText: '确定',
        type: 'warning',
        showClose: false,
        closeOnClickModal: false,
        closeOnPressEscape: false
      }).then(() => {
        removeToken()
        isRelogin.show = false
        window.location.href = window.location.href
      })
    } else {
      // 标准登录模式：原有逻辑不变
      ElMessageBox.confirm(t('sys.api.timeoutMessage'), t('common.confirmTitle'), {
        showCancelButton: false,
        closeOnClickModal: false,
        showClose: false,
        closeOnPressEscape: false,
        confirmButtonText: t('login.relogin'),
        type: 'warning'
      }).then(() => {
        resetRouter() // 重置静态路由表
        deleteUserCache() // 删除用户缓存
        removeToken()
        isRelogin.show = false
        // 干掉token后再走一次路由让它过router.beforeEach的校验
        window.location.href = window.location.href
      })
    }
  }
  return Promise.reject(t('sys.api.timeoutMessage'))
}
