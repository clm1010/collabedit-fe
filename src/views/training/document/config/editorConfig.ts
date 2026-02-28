export interface CollaborationConfig {
  wsUrl: string
  enabled: boolean
  reconnect: {
    maxAttempts: number
    interval: number
  }
  user: {
    defaultName: string
    defaultColor: string
  }
}

// 规范化 ws 地址，强制追加协同网关前缀，避免与其他网关冲突
// 支持三种格式:
// 1. 相对路径 (如 /ws) - 使用当前页面 host
// 2. 完整 URL (如 ws://localhost:3001) - 直接使用
// 3. 'auto' 或未配置 - 自动使用当前主机名 + 默认端口 3001
const resolveWsUrl = () => {
  const envUrl = import.meta.env.VITE_WS_URL as string | undefined
  const wsPort = (import.meta.env.VITE_WS_PORT as string | undefined) || '3001'

  if (!envUrl || envUrl === 'auto') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const hostname = window.location.hostname // 只取主机名，不含端口
    return `${protocol}//${hostname}:${wsPort}/collaboration`
  }

  if (envUrl.startsWith('/') && !envUrl.startsWith('//')) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const basePath = envUrl.replace(/\/+$/, '')
    return `${protocol}//${host}${basePath}/collaboration`
  }

  const normalized = envUrl.replace(/\/+$/, '')
  return normalized.endsWith('/collaboration') ? normalized : `${normalized}/collaboration`
}

export const defaultCollaborationConfig: CollaborationConfig = {
  wsUrl: resolveWsUrl(),
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

export const generateRandomUsername = (): string => {
  const adjectives = ['张', '王', '李', '赵', '陈', '诸葛', '司马', '杨', '刘', '曹', '孙']
  const nouns = ['懿', '亮', '修', '穆', '宫', '云', '典', '越', '羲之', '多余', '阳明', '子轩']
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  return `${adj}${noun}${Math.floor(Math.random() * 100)}`
}

export const defaultEditorOptions = {
  document: {
    placeholder: '开始输入内容...',
    enableSpellcheck: false
  },
  toolbar: {
    defaultMode: 'classic'
  },
  cdnUrl: '/editor-external'
}
