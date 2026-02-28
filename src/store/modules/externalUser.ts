/**
 * 外部用户 Store
 * 用于嵌入式场景（外部系统传递token）下的用户信息管理
 *
 * 存储方案：Pinia Store + sessionStorage
 * - Pinia Store：运行时响应式访问
 * - sessionStorage：刷新页面后恢复，标签页关闭自动清除（符合嵌入式安全需求）
 *
 * 数据获取：统一使用 /system/auth/get-permission-info 接口
 * - Java 后端与 Node 后端返回格式一致
 */
import { store } from '@/store'
import { defineStore } from 'pinia'
import request from '@/config/axios'

const STORAGE_KEY = 'external_user'

const backendType = import.meta.env.VITE_BACKEND_TYPE || 'node'

const USER_INFO_API: Record<string, string> = {
  java: '/sjrh/permission/getPermission',
  node: '/system/auth/get-permission-info'
}

/**
 * 外部用户信息接口
 */
export interface ExternalUserVO {
  id: string        // 用户唯一标识（协同编辑器需要）
  deptId: string     // 部门ID
  nickname: string   // 显示昵称（优先）
  username: string   // 用户名
  email: string      // 邮箱
  avatar: string     // 头像URL
  roles: string[]    // 角色列表
  permissions: string[] // 权限列表
}

/**
 * 响应适配器 - 将后端响应格式统一转换为 ExternalUserVO
 *
 * 注意：request.get() 经过两层解包（service.ts 拦截器 + index.ts return res.data），
 * 所以 res 已经是内层数据，不需要再 res.data 取值。
 *
 * 目前 Java 和 Node 返回格式一致，统一适配
 *
 * @param res 解包后的响应数据
 * @returns 统一的用户信息格式
 */
const adaptUserInfo = (res: any): ExternalUserVO => {
  const user = res?.user || {}
  return {
    id: String(user.id || ''),
    deptId: String(user.deptId || ''),
    nickname: user.nickname || user.username || '未知用户',
    username: user.username || '',
    email: user.email || '',
    avatar: user.avatar || '',
    roles: res?.roles || [],
    permissions: res?.permissions || []
  }
}

/**
 * 从 sessionStorage 读取用户信息
 * 旧格式数据（有 level 无 roles）视为无效，触发重新 fetchUserInfo
 */
const loadFromStorage = (): ExternalUserVO | null => {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    const parsed = JSON.parse(stored)
    if (!parsed.id || !parsed.username || !Array.isArray(parsed.roles)) {
      sessionStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed as ExternalUserVO
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
     * 获取用户名（优先返回 nickname）
     */
    getUsername(): string {
      return this.user?.nickname || this.user?.username || '未知用户'
    },

    /**
     * 获取角色列表
     */
    getRoles(): string[] {
      return this.user?.roles || []
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
     * 统一使用 /system/auth/get-permission-info 接口
     */
    async fetchUserInfo() {
      try {
        const apiUrl = USER_INFO_API[backendType] || USER_INFO_API.node
        console.log(`[ExternalUser] 使用 ${backendType} 后端, 接口: ${apiUrl}`)

        const res = await request.get({ url: apiUrl })
        const userInfo = adaptUserInfo(res)
        this.user = userInfo
        saveToStorage(userInfo)
        console.log('[ExternalUser] 用户信息已获取:', userInfo.nickname, `(${userInfo.id})`)
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
      console.log('[ExternalUser] 用户信息已存储:', user.nickname)
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
