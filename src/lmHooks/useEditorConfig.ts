/**
 * 编辑器配置 Hook
 * 统一管理 WebSocket URL、用户颜色、用户名称等配置
 */

/**
 * 协同编辑配置接口
 */
export interface CollaborationConfig {
  /** WebSocket 服务器地址 */
  wsUrl: string
  /** 是否启用协同编辑 */
  enabled: boolean
  /** 重连配置 */
  reconnect: {
    maxAttempts: number
    interval: number
  }
  /** 用户配置 */
  user: {
    defaultName: string
    defaultColor: string
  }
}

/**
 * 编辑器类型
 */
export type EditorType = 'document' | 'markdown'

/**
 * 可用的用户颜色列表
 */
const USER_COLORS = [
  '#409EFF', // 蓝色
  '#67C23A', // 绿色
  '#E6A23C', // 橙色
  '#F56C6C', // 红色
  '#909399', // 灰色
  '#00D8FF', // 青色
  '#845EC2', // 紫色
  '#FF6F91', // 粉色
  '#FFC75F', // 黄色
  '#4D8076' // 青绿色
]

/**
 * 随机用户名前缀
 */
const NAME_ADJECTIVES = ['张', '王', '李', '赵', '陈', '诸葛', '司马', '杨', '刘', '曹', '孙']

/**
 * 随机用户名后缀
 */
const NAME_NOUNS = ['懿', '亮', '修', '穆', '宫', '云', '典', '越', '羲之', '多余', '阳明', '子轩']

/**
 * 获取 WebSocket 基础 URL
 * 支持三种格式:
 * 1. 相对路径 (如 /ws) - 使用当前页面 host
 * 2. 完整 URL (如 ws://localhost:3001) - 直接使用
 * 3. 'auto' 或未配置 - 自动使用当前主机名 + 默认端口 3001
 */
const getWsBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_WS_URL as string | undefined
  const wsPort = (import.meta.env.VITE_WS_PORT as string | undefined) || '3001'

  // 如果未配置或配置为 'auto'，自动使用当前主机名 + 中间件端口
  if (!envUrl || envUrl === 'auto') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const hostname = window.location.hostname // 只取主机名，不含端口
    return `${protocol}//${hostname}:${wsPort}`
  }

  // 如果是相对路径，根据当前页面 host 动态构建完整 URL
  if (envUrl.startsWith('/') && !envUrl.startsWith('//')) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    return `${protocol}//${host}${envUrl.replace(/\/+$/, '')}`
  }

  // 完整 URL 格式，移除尾部斜杠
  return envUrl.replace(/\/+$/, '')
}

/**
 * 根据编辑器类型获取 WebSocket URL
 * @param type 编辑器类型
 */
export const getWsUrl = (type: EditorType): string => {
  const baseUrl = getWsBaseUrl()
  const pathSuffix = type === 'markdown' ? '/markdown' : '/collaboration'

  // 检查 baseUrl 是否已经包含路径后缀
  if (baseUrl.endsWith(pathSuffix)) {
    return baseUrl
  }

  return `${baseUrl}${pathSuffix}`
}

/**
 * 获取随机用户颜色
 */
export const getRandomUserColor = (): string => {
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)]
}

/**
 * 生成随机用户名
 */
export const generateRandomUsername = (): string => {
  const adj = NAME_ADJECTIVES[Math.floor(Math.random() * NAME_ADJECTIVES.length)]
  const noun = NAME_NOUNS[Math.floor(Math.random() * NAME_NOUNS.length)]
  return `${adj}${noun}${Math.floor(Math.random() * 100)}`
}

/**
 * 获取默认协同配置
 * @param type 编辑器类型
 */
export const getDefaultCollaborationConfig = (type: EditorType): CollaborationConfig => {
  return {
    wsUrl: getWsUrl(type),
    enabled: true,
    reconnect: {
      maxAttempts: 10,
      interval: 3000
    },
    user: {
      defaultName: '访客',
      defaultColor: '#409EFF'
    }
  }
}

/**
 * 编辑器配置 Hook
 * @param type 编辑器类型
 */
export function useEditorConfig(type: EditorType = 'document') {
  const config = getDefaultCollaborationConfig(type)

  return {
    /** 协同配置 */
    config,
    /** WebSocket URL */
    wsUrl: config.wsUrl,
    /** 获取随机用户颜色 */
    getRandomUserColor,
    /** 生成随机用户名 */
    generateRandomUsername,
    /** 重连配置 */
    reconnectConfig: config.reconnect
  }
}

export default useEditorConfig
