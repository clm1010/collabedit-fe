/**
 * Markdown 协同编辑器配置文件
 */

export interface MarkdownCollaborationConfig {
  // WebSocket 服务器地址 (使用独立的 /markdown 路径)
  wsUrl: string
  // 是否启用协同编辑
  enabled: boolean
  // 重连配置
  reconnect: {
    maxAttempts: number
    interval: number
  }
  // 用户配置
  user: {
    defaultName: string
    defaultColor: string
  }
}

// 获取 WebSocket 基础 URL
// 支持三种格式:
// 1. 相对路径 (如 /ws) - 使用当前页面 host
// 2. 完整 URL (如 ws://localhost:3001) - 直接使用
// 3. 'auto' 或未配置 - 自动使用当前主机名 + 默认端口 3001
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

  // 确保 URL 格式正确
  return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl
}

// 默认配置
export const defaultMarkdownConfig: MarkdownCollaborationConfig = {
  // 使用独立的 /markdown WebSocket 路径
  wsUrl: `${getWsBaseUrl()}/markdown`,
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

// 获取随机用户颜色
export const getRandomUserColor = (): string => {
  const colors = [
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
  return colors[Math.floor(Math.random() * colors.length)]
}

// 生成随机用户名
export const generateRandomUsername = (): string => {
  const adjectives = ['张', '王', '李', '赵', '陈', '诸葛', '司马', '杨', '刘', '曹', '孙']
  const nouns = ['懿', '亮', '修', '穆', '宫', '云', '典', '越', '羲之', '多余', '阳明', '子轩']
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  return `${adj}${noun}${Math.floor(Math.random() * 100)}`
}

// Markdown 编辑器默认配置
export const defaultEditorOptions = {
  // 文档配置
  document: {
    placeholder: '开始编写模板内容...',
    enableSpellcheck: false
  },
  // 工具栏配置
  toolbar: {
    defaultMode: 'classic'
  }
}
