import { ref, onBeforeUnmount, type Ref } from 'vue'
import { ElMessage } from 'element-plus'
import { isNil } from 'lodash-es'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

/**
 * 全局错误处理器引用计数
 * 用于确保只有一个组件实例注册全局错误处理器
 */
let globalErrorHandlerRefCount = 0
let originalOnError: OnErrorEventHandler | null = null

/**
 * 注册 y-prosemirror 相关错误的全局处理器
 * 这些错误通常是由于协作光标位置无效导致的，不影响编辑功能
 */
const registerYjsErrorHandler = () => {
  if (globalErrorHandlerRefCount === 0) {
    originalOnError = window.onerror
    window.onerror = (message, source, lineno, colno, error) => {
      // 检查是否是 y-prosemirror 相关的已知错误
      const messageStr = String(message)
      const isYjsError =
        messageStr.includes('nodeSize') ||
        messageStr.includes('relativePositionToAbsolutePosition') ||
        messageStr.includes('Unexpected end of array') ||
        messageStr.includes('Unexpected case')

      if (isYjsError) {
        // 抑制这些错误，只在开发模式下打印警告
        if (import.meta.env.DEV) {
          console.warn('[协同编辑] 捕获到已知的 y-prosemirror 错误（已忽略）:', messageStr)
        }
        return true // 阻止错误继续传播
      }

      // 其他错误交给原始处理器
      if (originalOnError) {
        return originalOnError(message, source, lineno, colno, error)
      }
      return false
    }
  }
  globalErrorHandlerRefCount++
}

/**
 * 注销全局错误处理器
 */
const unregisterYjsErrorHandler = () => {
  if (globalErrorHandlerRefCount <= 0) return // 防止多次注销导致计数变为负数
  globalErrorHandlerRefCount--
  if (globalErrorHandlerRefCount === 0 && originalOnError !== null) {
    window.onerror = originalOnError
    originalOnError = null
  }
}

/**
 * 协作用户信息
 */
export interface CollaborationUser {
  id: string
  name: string
  color: string
  deviceId?: string // 设备唯一标识，支持同一用户多设备连接
  avatar?: string
  role?: string
  joinTime?: number
}

/**
 * 协作者信息（包含运行时状态）
 */
export interface Collaborator extends CollaborationUser {
  clientId: number
  isSelf: boolean
  isOwner: boolean
}

/**
 * useCollaboration 配置项
 */
export interface UseCollaborationOptions {
  /** 文档ID */
  documentId: string
  /** WebSocket 服务地址 */
  wsUrl: string
  /** 当前用户信息 */
  user: CollaborationUser
  /** 创建者ID（用于标记 isOwner） */
  creatorId?: string | number
  /** 是否显示连接成功消息 */
  showConnectMessage?: boolean
  /** 连接状态变化回调 */
  onConnectionChange?: (status: string) => void
  /** 协作者列表变化回调 */
  onCollaboratorsChange?: (collaborators: Collaborator[]) => void
  /** 同步完成回调 */
  onSynced?: () => void
}

/**
 * 协同初始化可选项
 */
export interface InitCollaborationOptions {
  /** 是否立即建立 WebSocket 连接 */
  autoConnect?: boolean
}

/**
 * 连接诊断信息
 */
export interface ConnectionDiagnostics {
  /** 当前连接状态 */
  status: string
  /** WebSocket 连接状态 */
  wsConnected: boolean
  /** 是否已同步 */
  synced: boolean
  /** 文档ID */
  documentId: string
  /** WebSocket URL */
  wsUrl: string
  /** 当前用户信息 */
  user: {
    id: string
    name: string
    deviceId?: string
  }
  /** 连接时间戳 */
  connectedAt?: number
  /** 协作者数量 */
  collaboratorCount: number
  /** awareness clientID */
  awarenessClientId?: number
  /** 连接历史记录 */
  connectionHistory: Array<{
    event: string
    timestamp: number
    details?: string
  }>
}

/**
 * useCollaboration 返回值
 */
export interface UseCollaborationReturn {
  /** Yjs 文档实例 */
  ydoc: Ref<Y.Doc | null>
  /** Yjs XmlFragment（用于 Tiptap Collaboration 扩展） */
  fragment: Ref<Y.XmlFragment | null>
  /** WebSocket Provider 实例 */
  provider: Ref<WebsocketProvider | null>
  /** 连接状态 */
  connectionStatus: Ref<string>
  /** 协作者列表 */
  collaborators: Ref<Collaborator[]>
  /** 是否协同就绪 */
  isReady: Ref<boolean>
  /** 初始化协同编辑 */
  initCollaboration: (options?: InitCollaborationOptions) => void
  /** 主动连接协同服务（用于延迟连接场景） */
  connectProvider: () => void
  /** 清理协同资源 */
  cleanup: () => void
  /** 重新初始化协同编辑（用于切换文档） */
  reinitialize: (
    newDocumentId?: string,
    newCreatorId?: string | number,
    options?: InitCollaborationOptions
  ) => void
  /** 获取连接诊断信息 */
  getDiagnostics: () => ConnectionDiagnostics
  /** 输出诊断信息到控制台 */
  logDiagnostics: () => void
}

/**
 * 协同编辑 Hook
 * 封装 Yjs + WebSocket Provider 的初始化、状态管理、清理逻辑
 *
 * @example
 * ```ts
 * const {
 *   ydoc,
 *   provider,
 *   connectionStatus,
 *   collaborators,
 *   isReady,
 *   initCollaboration,
 *   cleanup
 * } = useCollaboration({
 *   documentId: 'doc-123',
 *   wsUrl: 'ws://localhost:1234',
 *   user: { id: '1', name: '用户1', color: '#ff0000' }
 * })
 *
 * onMounted(() => {
 *   initCollaboration()
 * })
 * ```
 */
export function useCollaboration(options: UseCollaborationOptions): UseCollaborationReturn {
  const {
    wsUrl,
    user,
    showConnectMessage = true,
    onConnectionChange,
    onCollaboratorsChange,
    onSynced
  } = options

  // 可变的配置（支持动态切换文档）
  let currentDocumentId = options.documentId
  let currentCreatorId = options.creatorId

  // 响应式状态
  const ydoc = ref<Y.Doc | null>(null)
  const fragment = ref<Y.XmlFragment | null>(null)
  const provider = ref<WebsocketProvider | null>(null)
  const connectionStatus = ref('未连接')
  const collaborators = ref<Collaborator[]>([])
  const isReady = ref(false)

  // 内部状态（非响应式）
  let isComponentDestroyed = false
  let hasShownConnectedMessage = false
  let hasShownSyncedMessage = false
  let syncTimeoutId: ReturnType<typeof setTimeout> | null = null
  let updateCollaboratorsTimer: ReturnType<typeof setTimeout> | null = null
  let connectedAtTimestamp: number | undefined = undefined

  // 连接历史记录（用于诊断）
  const connectionHistory: Array<{
    event: string
    timestamp: number
    details?: string
  }> = []

  /**
   * 记录连接事件到历史
   */
  const logConnectionEvent = (event: string, details?: string) => {
    const entry = {
      event,
      timestamp: Date.now(),
      details
    }
    connectionHistory.push(entry)
    // 只保留最近 50 条记录
    if (connectionHistory.length > 50) {
      connectionHistory.shift()
    }
    // 输出到控制台
    console.log(`[协同编辑] ${event}`, details ? `- ${details}` : '')
  }

  // 事件处理函数引用（用于正确移除事件监听器）
  let handleProviderStatus: ((event: any) => void) | null = null
  let handleProviderSync: ((synced: boolean) => void) | null = null
  let handleAwarenessChange: (() => void) | null = null

  /**
   * 更新协作者列表（带防抖）
   */
  const updateCollaborators = () => {
    if (isComponentDestroyed || isNil(provider.value)) return

    // 防抖：避免频繁更新
    if (!isNil(updateCollaboratorsTimer)) {
      clearTimeout(updateCollaboratorsTimer)
    }

    updateCollaboratorsTimer = setTimeout(() => {
      if (isComponentDestroyed || isNil(provider.value)) return

      const states = provider.value.awareness.getStates()
      // 使用 Map 按用户 ID 去重，保留最新的连接
      const userMap = new Map<string, Collaborator>()

      states.forEach((state: any, clientId: number) => {
        if (state.user) {
          // 使用用户ID去重，如果没有ID则使用clientId
          const userId = state.user.id || `client_${clientId}`
          const isSelf = clientId === provider.value!.awareness.clientID

          // 如果是自己，优先使用；否则只在没有记录时添加
          if (isSelf || !userMap.has(userId)) {
            userMap.set(userId, {
              clientId,
              ...state.user,
              isSelf,
              isOwner: currentCreatorId !== undefined && state.user.id === currentCreatorId
            })
          }
        }
      })

      // 转换为数组
      const users = Array.from(userMap.values())

      // 将当前用户排在第一位
      users.sort((a, b) => {
        if (a.isSelf) return -1
        if (b.isSelf) return 1
        return 0
      })

      collaborators.value = users
      onCollaboratorsChange?.(users)
    }, 100) // 100ms 防抖
  }

  /**
   * 初始化协同编辑
   */
  const initCollaboration = (initOptions: InitCollaborationOptions = {}) => {
    try {
      // 注册全局错误处理器，用于捕获 y-prosemirror 的已知错误
      registerYjsErrorHandler()

      logConnectionEvent(
        '初始化开始',
        `文档: ${currentDocumentId}, 用户: ${user.name} (${user.id})`
      )

      // 重置消息标志
      hasShownConnectedMessage = false
      hasShownSyncedMessage = false
      connectedAtTimestamp = undefined

      // 初始化 Y.Doc
      ydoc.value = new Y.Doc()

      // 预先初始化 fragment，确保在编辑器初始化前它已存在
      // 使用 'default' 作为 field 名称（与 Tiptap Collaboration 扩展的默认值一致）
      fragment.value = ydoc.value.getXmlFragment('default')

      logConnectionEvent('Y.Doc 初始化完成')

      // 初始化 WebSocket Provider
      const deviceId = user.deviceId || ''
      logConnectionEvent('WebSocket 连接参数', `URL: ${wsUrl}, deviceId: ${deviceId || '未设置'}`)

      const { autoConnect = true } = initOptions
      provider.value = new WebsocketProvider(wsUrl, currentDocumentId, ydoc.value, {
        connect: autoConnect,
        params: {
          documentId: currentDocumentId,
          userId: String(user.id),
          userName: user.name,
          userColor: user.color,
          deviceId // 设备ID，支持同一用户多设备连接
        }
      })

      // 定义事件处理函数（保存引用以便后续移除）
      handleProviderStatus = (event: any) => {
        if (isComponentDestroyed) return

        const status = event.status

        if (status === 'disconnected') {
          connectionStatus.value = '连接断开'
          hasShownConnectedMessage = false
          hasShownSyncedMessage = false
          logConnectionEvent('连接断开')
        } else if (status === 'connected') {
          connectionStatus.value = '已连接'
          connectedAtTimestamp = Date.now()
          logConnectionEvent(
            '连接成功',
            `awareness clientId: ${provider.value?.awareness?.clientID}`
          )
          if (showConnectMessage && !hasShownConnectedMessage) {
            hasShownConnectedMessage = true
            ElMessage.success('已连接到协同服务')
          }
          updateCollaborators()
        } else if (status === 'connecting') {
          connectionStatus.value = '连接中...'
          logConnectionEvent('正在连接')
        }

        onConnectionChange?.(connectionStatus.value)
      }

      handleProviderSync = (synced: boolean) => {
        if (isComponentDestroyed) return

        logConnectionEvent('同步状态变化', synced ? '已同步' : '同步中')

        if (synced && !hasShownSyncedMessage) {
          hasShownSyncedMessage = true
          isReady.value = true
          logConnectionEvent('协同编辑就绪', `协作者数量: ${collaborators.value.length}`)
          updateCollaborators()
          onSynced?.()
        }
      }

      handleAwarenessChange = () => {
        if (isComponentDestroyed) return
        try {
          updateCollaborators()
        } catch (e) {
          // 忽略 awareness 更新中的错误，这些通常是由于离线用户的光标位置无效导致的
          console.warn('[协同编辑] awareness 更新出错:', e)
        }
      }

      // 监听连接状态
      provider.value.on('status', handleProviderStatus)

      // 监听同步状态
      provider.value.on('sync', handleProviderSync)

      // 监听感知信息（在线用户）
      provider.value.awareness.on('change', handleAwarenessChange)

      // 设置当前用户状态到 awareness
      const userState = {
        id: user.id,
        name: user.name,
        color: user.color,
        deviceId: user.deviceId || '',
        avatar: user.avatar || '',
        role: user.role || '编辑者',
        joinTime: user.joinTime || Date.now()
      }
      provider.value.awareness.setLocalStateField('user', userState)

      // 立即更新一次协作者列表
      updateCollaborators()

      // 重要：检查 provider 是否已经同步（sync 事件可能在注册监听器之前就触发了）
      // 必须在注册监听器之后立即检查，避免遗漏已同步的情况
      if (provider.value.synced && !isReady.value) {
        // 使用 nextTick 确保 Y.Doc 的内部结构已完全初始化
        setTimeout(() => {
          if (isComponentDestroyed) return
          if (!isReady.value && provider.value?.synced) {
            hasShownSyncedMessage = true
            isReady.value = true
            updateCollaborators()
            onSynced?.()
          }
        }, 50)
      }

      // 第一级超时（3s）：如果连接已建立但还没有收到 sync 事件，强制标记就绪并触发 onSynced
      syncTimeoutId = setTimeout(() => {
        if (isComponentDestroyed) return

        if (!isReady.value && provider.value?.wsconnected) {
          logConnectionEvent('同步超时(3s)', '连接已建立但未收到sync事件，强制标记就绪')
          hasShownSyncedMessage = true
          isReady.value = true
          updateCollaborators()
          onSynced?.()
        }
      }, 3000)
    } catch (error) {
      // 初始化失败时注销已注册的全局错误处理器，防止引用计数泄漏
      unregisterYjsErrorHandler()
      logConnectionEvent('初始化失败', (error as Error).message)
      console.error('协同编辑初始化失败:', error)
      ElMessage.error('协同编辑初始化失败: ' + (error as Error).message)
    }
  }

  /**
   * 主动连接协同服务（用于延迟连接场景）
   */
  const connectProvider = () => {
    if (!provider.value) return
    if (provider.value.wsconnected) return
    try {
      provider.value.connect()
      logConnectionEvent('手动连接 WebSocket')
    } catch (e) {
      console.warn('手动连接 WebSocket 失败:', e)
    }
  }

  /**
   * 清理协同资源
   */
  const cleanup = () => {
    logConnectionEvent('开始清理连接资源')

    // 注销全局错误处理器
    unregisterYjsErrorHandler()

    // 标记组件已销毁，防止异步回调继续执行
    isComponentDestroyed = true

    // 清理 syncTimeout
    if (syncTimeoutId) {
      clearTimeout(syncTimeoutId)
      syncTimeoutId = null
    }

    // 清理 updateCollaboratorsTimer（防抖定时器）
    if (updateCollaboratorsTimer) {
      clearTimeout(updateCollaboratorsTimer)
      updateCollaboratorsTimer = null
    }

    // 销毁 WebSocket Provider
    if (provider.value) {
      try {
        // 移除所有事件监听器（使用保存的函数引用）
        if (handleAwarenessChange) {
          provider.value.awareness.off('change', handleAwarenessChange)
        }
        if (handleProviderStatus) {
          provider.value.off('status', handleProviderStatus)
        }
        if (handleProviderSync) {
          provider.value.off('sync', handleProviderSync)
        }
        // 移除用户状态
        provider.value.awareness.setLocalStateField('user', null)
      } catch (e) {
        console.warn('清理 provider 时出错:', e)
      }
      provider.value.destroy()
      provider.value = null
    }

    // 清理事件处理函数引用
    handleProviderStatus = null
    handleProviderSync = null
    handleAwarenessChange = null

    // 清理 fragment 引用（fragment 会随 ydoc 一起销毁，这里只清理引用）
    fragment.value = null

    // 销毁 Y.Doc
    if (ydoc.value) {
      try {
        ydoc.value.destroy()
      } catch (e) {
        console.warn('清理 ydoc 时出错:', e)
      }
      ydoc.value = null
    }

    // 清理其他响应式引用
    collaborators.value = []
    isReady.value = false
  }

  /**
   * 重新初始化协同编辑（用于切换文档）
   * @param newDocumentId 新的文档ID
   * @param newCreatorId 新的创建者ID（可选）
   */
  const reinitialize = (
    newDocumentId?: string,
    newCreatorId?: string | number,
    initOptions: InitCollaborationOptions = {}
  ) => {
    // 先清理现有资源
    cleanup()

    // 更新文档ID
    if (newDocumentId) {
      currentDocumentId = newDocumentId
    }

    // 更新创建者ID
    if (newCreatorId !== undefined) {
      currentCreatorId = newCreatorId
    }

    // 重置内部状态标志
    isComponentDestroyed = false
    hasShownConnectedMessage = false
    hasShownSyncedMessage = false

    // 重新初始化
    initCollaboration(initOptions)
  }

  /**
   * 获取连接诊断信息
   */
  const getDiagnostics = (): ConnectionDiagnostics => {
    return {
      status: connectionStatus.value,
      wsConnected: provider.value?.wsconnected ?? false,
      synced: provider.value?.synced ?? false,
      documentId: currentDocumentId,
      wsUrl,
      user: {
        id: user.id,
        name: user.name,
        deviceId: user.deviceId
      },
      connectedAt: connectedAtTimestamp,
      collaboratorCount: collaborators.value.length,
      awarenessClientId: provider.value?.awareness?.clientID,
      connectionHistory: [...connectionHistory]
    }
  }

  /**
   * 输出诊断信息到控制台
   */
  const logDiagnostics = () => {
    const diag = getDiagnostics()

    console.group('🔍 协同编辑连接诊断')
    console.log('连接状态:', diag.status)
    console.log('WebSocket 连接:', diag.wsConnected ? '✅ 已连接' : '❌ 未连接')
    console.log('数据同步:', diag.synced ? '✅ 已同步' : '❌ 未同步')
    console.log('文档ID:', diag.documentId)
    console.log('WebSocket URL:', diag.wsUrl)
    console.log('用户信息:', {
      id: diag.user.id,
      name: diag.user.name,
      deviceId: diag.user.deviceId || '未设置'
    })
    console.log(
      '连接时间:',
      diag.connectedAt ? new Date(diag.connectedAt).toLocaleString() : '未连接'
    )
    console.log('协作者数量:', diag.collaboratorCount)
    console.log('Awareness ClientID:', diag.awarenessClientId ?? '未分配')

    if (diag.connectionHistory.length > 0) {
      console.log('')
      console.log('最近连接事件:')
      diag.connectionHistory.slice(-10).forEach((entry) => {
        const time = new Date(entry.timestamp).toLocaleTimeString()
        console.log(`  [${time}] ${entry.event}${entry.details ? ` - ${entry.details}` : ''}`)
      })
    }

    console.groupEnd()
  }

  // 组件卸载时自动清理
  onBeforeUnmount(() => {
    cleanup()
  })

  return {
    ydoc,
    fragment,
    provider,
    connectionStatus,
    collaborators,
    isReady,
    initCollaboration,
    connectProvider,
    cleanup,
    reinitialize,
    getDiagnostics,
    logDiagnostics
  }
}

export default useCollaboration
