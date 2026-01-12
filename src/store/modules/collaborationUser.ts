import { store } from '@/store'
import { defineStore } from 'pinia'
import { nanoid } from 'nanoid'
import { getRandomUserColor, generateRandomUsername } from '@/views/training/document/config/editorConfig'

// sessionStorage 存储键
const STORAGE_KEY = 'collaboration_user'

/**
 * 协作编辑用户信息
 */
export interface CollaborationUserVO {
  id: string
  name: string
  color: string
  createdAt: number
}

interface CollaborationUserState {
  user: CollaborationUserVO | null
}

/**
 * 从 sessionStorage 读取用户信息
 */
const loadUserFromStorage = (): CollaborationUserVO | null => {
  try {
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
 * 保存用户信息到 sessionStorage
 */
const saveUserToStorage = (user: CollaborationUserVO): void => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user))
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
     * 如果已存在用户则返回，否则创建新用户
     */
    getOrCreateUser(): CollaborationUserVO {
      if (this.user) {
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
        createdAt: Date.now()
      }

      this.user = user
      saveUserToStorage(user)

      console.log('🎭 创建协作用户:', user.name, `(${user.id})`)
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
