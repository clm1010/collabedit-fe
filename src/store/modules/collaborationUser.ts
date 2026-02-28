import { store } from '@/store'
import { defineStore } from 'pinia'
import { nanoid } from 'nanoid'
import {
  getRandomUserColor,
  generateRandomUsername
} from '@/views/training/document/config/editorConfig'
import { isExternalTokenMode } from '@/utils/auth'
import { useExternalUserStore } from './externalUser'

// 是否跳过认证（本地开发模式）
const skipAuth = import.meta.env.VITE_SKIP_AUTH === 'true'

/**
 * 根据用户ID生成一致的颜色
 * 同一个用户ID每次得到相同颜色，保证协作体验一致
 */
const getColorByUserId = (userId: string): string => {
  const colors = [
    '#409EFF',
    '#67C23A',
    '#E6A23C',
    '#F56C6C',
    '#909399',
    '#00d4aa',
    '#7c4dff',
    '#ff6d00',
    '#00bfa5',
    '#d500f9'
  ]
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

const STORAGE_KEY = 'collaboration_user'
const DEV_USER_STORAGE_KEY = 'collaboration_user_dev'
const DEVICE_ID_KEY = 'collaboration_device_id'

/**
 * 获取或生成设备ID
 * 设备ID 存储在 localStorage 中，保持设备唯一性
 * 即使清除 sessionStorage 也不会改变
 */
const getOrCreateDeviceId = (): string => {
  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY)
    if (!deviceId) {
      deviceId = `device_${nanoid(12)}`
      localStorage.setItem(DEVICE_ID_KEY, deviceId)
      console.log('🔧 生成新设备ID:', deviceId)
    }
    return deviceId
  } catch (e) {
    // 如果 localStorage 不可用，每次生成新的（降级处理）
    console.warn('localStorage 不可用，使用临时设备ID')
    return `temp_${nanoid(12)}`
  }
}

/**
 * 标签页 ID（模块级内存常量）
 * 每次页面加载生成唯一 tabId，不存入任何 storage
 * - 避免标签页复制时 sessionStorage 共享导致 tabId 混乱
 * - 每个标签页/页面加载都有独立的 tabId
 */
const PAGE_TAB_ID = `tab_${nanoid(8)}`
const getOrCreateTabId = (): string => PAGE_TAB_ID

/**
 * 协作编辑用户信息
 */
export interface CollaborationUserVO {
  id: string
  name: string
  color: string
  deviceId: string // 设备唯一标识（localStorage，同一浏览器共享）
  tabId: string    // 标签页唯一标识（sessionStorage，每个标签页独立）
  createdAt: number
}

interface CollaborationUserState {
  user: CollaborationUserVO | null
}

/**
 * 从 storage 读取用户信息
 * - 开发模式（skipAuth=true）：从 localStorage 读取（同一浏览器共享用户身份）
 * - 外部用户模式：从 sessionStorage 读取
 */
const loadUserFromStorage = (): CollaborationUserVO | null => {
  try {
    // 开发模式：优先从 localStorage 读取
    if (skipAuth) {
      const stored = localStorage.getItem(DEV_USER_STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored) as CollaborationUserVO
      }
    }
    // 外部用户模式：从 sessionStorage 读取
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored) as CollaborationUserVO
    }
  } catch (e) {
    console.warn('读取协作用户信息失败:', e)
  }
  return null
}

/**
 * 保存用户信息到 storage
 * - 开发模式（skipAuth=true）：写入 localStorage（同一浏览器所有标签页共享）
 * - 外部用户模式：写入 sessionStorage
 */
const saveUserToStorage = (user: CollaborationUserVO): void => {
  try {
    if (skipAuth) {
      localStorage.setItem(DEV_USER_STORAGE_KEY, JSON.stringify(user))
    } else {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    }
  } catch (e) {
    console.warn('保存协作用户信息失败:', e)
  }
}

/**
 * 协作编辑用户管理 Store
 *
 * 用于管理协作编辑场景下的模拟用户信息
 * - 使用 nanoid 生成唯一用户ID
 * - 使用 sessionStorage 保持标签页内用户一致性
 * - 每个浏览器标签页独立用户，关闭标签页后用户丢失
 */
export const useCollaborationUserStore = defineStore('collaboration-user', {
  state: (): CollaborationUserState => ({
    user: loadUserFromStorage()
  }),

  getters: {
    /**
     * 获取当前协作用户
     */
    getUser(): CollaborationUserVO | null {
      return this.user
    },

    /**
     * 判断是否已有用户
     */
    hasUser(): boolean {
      return this.user !== null
    }
  },

  actions: {
    /**
     * 获取或创建协作用户
     *
     * 模式判断：
     * - 嵌入式生产模式（skipAuth=false + externalToken=true）：使用真实用户
     * - 其他模式（本地开发 / 独立登录）：使用随机模拟用户
     */
    getOrCreateUser(): CollaborationUserVO {
      if (!skipAuth && isExternalTokenMode()) {
        const externalUserStore = useExternalUserStore()
        const externalUser = externalUserStore.getUser
        if (externalUser && externalUser.id) {
          if (this.user && this.user.id === externalUser.id) {
            this.user.tabId = getOrCreateTabId()
            return this.user
          }
          const user: CollaborationUserVO = {
            id: externalUser.id,
            name: externalUser.nickname || externalUser.username,
            color: getColorByUserId(externalUser.id),
            deviceId: getOrCreateDeviceId(),
            tabId: getOrCreateTabId(),
            createdAt: Date.now()
          }
          this.user = user
          saveUserToStorage(user)
          console.log('👤 使用真实用户:', user.name, `(${user.id})`, `设备: ${user.deviceId}`)
          return user
        }
      }
      if (this.user) {
        if (!this.user.deviceId) {
          this.user.deviceId = getOrCreateDeviceId()
          saveUserToStorage(this.user)
        }
        this.user.tabId = getOrCreateTabId()
        return this.user
      }
      return this.createUser()
    },

    /**
     * 创建新的协作用户
     */
    createUser(): CollaborationUserVO {
      const user: CollaborationUserVO = {
        id: nanoid(),
        name: generateRandomUsername(),
        color: getRandomUserColor(),
        deviceId: getOrCreateDeviceId(),
        tabId: getOrCreateTabId(),
        createdAt: Date.now()
      }

      this.user = user
      saveUserToStorage(user)

      console.log('🎭 创建协作用户:', user.name, `(${user.id})`, `设备: ${user.deviceId}`)
      return user
    },

    /**
     * 更新用户名称
     */
    updateUserName(name: string): void {
      if (this.user) {
        this.user.name = name
        saveUserToStorage(this.user)
      }
    },

    /**
     * 更新用户颜色
     */
    updateUserColor(color: string): void {
      if (this.user) {
        this.user.color = color
        saveUserToStorage(this.user)
      }
    },

    /**
     * 清除用户信息（用于测试或重置）
     */
    clearUser(): void {
      this.user = null
      sessionStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(DEV_USER_STORAGE_KEY)
      console.log('🗑️ 清除协作用户信息')
    }
  }
})

/**
 * 在 setup 外部使用
 */
export const useCollaborationUserStoreWithOut = () => {
  return useCollaborationUserStore(store)
}
