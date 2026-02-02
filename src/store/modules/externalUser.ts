/**
 * 外部用户 Store
 * 用于嵌入式场景（外部系统传递token）下的用户信息管理
 *
 * 存储方案：Pinia Store + sessionStorage
 * - Pinia Store：运行时响应式访问
 * - sessionStorage：刷新页面后恢复，标签页关闭自动清除（符合嵌入式安全需求）
 *
 * 数据获取：
 * - Java 后端: /system/auth/get-permission-info（芋道）
 * - Node 后端: /api/user/info
 */
import { store } from '@/store'
import { defineStore } from 'pinia'
import request from '@/config/axios'

// sessionStorage 存储键
const STORAGE_KEY = 'external_user'

// ========== 后端类型适配 ==========
// 后端类型：java | node
const backendType = import.meta.env.VITE_BACKEND_TYPE || 'node'

// 接口路径映射
const USER_INFO_API: Record<string, string> = {
  java: '/system/auth/get-permission-info',
  node: '/api/user/info'
}

/**
 * 外部用户信息接口
 */
export interface ExternalUserVO {
  username: string // 用户名
  level: string // 职级
  permissions: string[] // 权限列表
}

/**
 * 响应适配器 - 将不同后端的响应格式统一转换为 ExternalUserVO
 * @param res 后端原始响应
 * @returns 统一的用户信息格式
 */
const adaptUserInfo = (res: any): ExternalUserVO => {
  if (backendType === 'java') {
    // 芋道格式: { code: 0, data: { user: { nickname, avatar, ... }, roles, permissions } }
    const data = res.data || res
    return {
      username: data?.user?.nickname || data?.user?.username || '未知用户',
      level: data?.user?.level || '普通用户',
      permissions: data?.permissions || []
    }
  }
  // Node 格式: { code: 200, data: { username, level, permissions } }
  const data = res.data || res
  return {
    username: data?.username || '未知用户',
    level: data?.level || '普通用户',
    permissions: data?.permissions || []
  }
}

/**
 * 从 sessionStorage 读取用户信息
 */
const loadFromStorage = (): ExternalUserVO | null => {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch (e) {
    console.warn('[ExternalUser] 读取用户信息失败:', e)
    return null
  }
}

/**
 * 保存用户信息到 sessionStorage
 */
const saveToStorage = (user: ExternalUserVO): void => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  } catch (e) {
    console.warn('[ExternalUser] 保存用户信息失败:', e)
  }
}

/**
 * 外部用户 Store
 */
export const useExternalUserStore = defineStore('external-user', {
  state: () => ({
    user: loadFromStorage() as ExternalUserVO | null
  }),

  getters: {
    /**
     * 是否已有用户信息
     */
    hasUser(): boolean {
      return this.user !== null
    },

    /**
     * 获取用户信息
     */
    getUser(): ExternalUserVO | null {
      return this.user
    },

    /**
     * 获取用户名
     */
    getUsername(): string {
      return this.user?.username || '未知用户'
    },

    /**
     * 获取职级
     */
    getLevel(): string {
      return this.user?.level || '普通用户'
    },

    /**
     * 获取权限列表
     */
    getPermissions(): string[] {
      return this.user?.permissions || []
    }
  },

  actions: {
    /**
     * 从后端获取用户信息
     * - Java 后端: /system/auth/get-permission-info
     * - Node 后端: /api/user/info
     */
    async fetchUserInfo() {
      try {
        const apiUrl = USER_INFO_API[backendType] || USER_INFO_API.node
        console.log(`[ExternalUser] 使用 ${backendType} 后端, 接口: ${apiUrl}`)

        const res = await request.get({ url: apiUrl })
        // 兼容两种成功码: Java (code: 0) 和 Node (code: 200)
        if (res.code === 200 || res.code === 0 || res.data) {
          const userInfo = adaptUserInfo(res)
          this.user = userInfo
          saveToStorage(userInfo)
          console.log('[ExternalUser] 用户信息已获取:', userInfo.username)
        }
      } catch (e) {
        console.warn('[ExternalUser] 获取用户信息失败:', e)
      }
    },

    /**
     * 设置用户信息
     */
    setUser(user: ExternalUserVO) {
      this.user = user
      saveToStorage(user)
      console.log('[ExternalUser] 用户信息已存储:', user.username)
    },

    /**
     * 清除用户信息（Token过期或退出登录时调用）
     */
    clearUser() {
      this.user = null
      sessionStorage.removeItem(STORAGE_KEY)
      console.log('[ExternalUser] 用户信息已清除')
    },

    /**
     * 检查是否有指定权限
     */
    hasPermission(permission: string): boolean {
      return this.user?.permissions?.includes(permission) || false
    }
  }
})

/**
 * 在 setup 外部使用
 */
export const useExternalUserStoreWithOut = () => {
  return useExternalUserStore(store)
}
