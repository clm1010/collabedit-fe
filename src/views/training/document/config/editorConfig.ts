/**
 * Umo Editor 协同编辑配置文件
 */

export interface CollaborationConfig {
  // WebSocket 服务器地址
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

// 默认配置
// 规范化 ws 地址，强制追加协同网关前缀，避免与其他网关冲突
const resolveWsUrl = () => {
  const envUrl = (import.meta.env.VITE_WS_URL as string | undefined) || 'ws://localhost:3001'
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

// Umo Editor 默认配置
export const defaultEditorOptions = {
  // 文档配置
  document: {
    placeholder: '开始输入内容...',
    enableSpellcheck: false
  },
  // 工具栏配置
  toolbar: {
    defaultMode: 'classic'
  },
  // CDN 配置 - 使用本地资源而不是 unpkg.com
  cdnUrl: '/editor-external'
}
