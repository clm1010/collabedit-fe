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
      let messageStr: string
      try {
        messageStr = String(message)
      } catch {
        messageStr = ''
      }
      const isYjsError =
        messageStr.includes('nodeSize') ||
        messageStr.includes('relativePositionToAbsolutePosition') ||
        messageStr.includes('Unexpected end of array') ||
        messageStr.includes('Unexpected case')

      if (isYjsError) {
        if (import.meta.env.DEV) {
          console.warn('[协同编辑] 捕获到已知的 y-prosemirror 错误（已忽略）:', messageStr)
        }
        return true
      }

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
  if (globalErrorHandlerRefCount <= 0) return
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
  tabId?: string    // 标签页唯一标识（内存生成，每个标签页独立）
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

  let currentDocumentId = options.documentId
  let currentCreatorId = options.creatorId

  const ydoc = ref<Y.Doc | null>(null)
  const fragment = ref<Y.XmlFragment | null>(null)
  const provider = ref<WebsocketProvider | null>(null)
  const connectionStatus = ref('未连接')
  const collaborators = ref<Collaborator[]>([])
  const isReady = ref(false)

  let isComponentDestroyed = false
  let hasShownConnectedMessage = false
  let hasShownSyncedMessage = false
  let syncTimeoutId: ReturnType<typeof setTimeout> | null = null
  let updateCollaboratorsTimer: ReturnType<typeof setTimeout> | null = null
  let connectedAtTimestamp: number | undefined = undefined

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
    if (connectionHistory.length > 50) {
      connectionHistory.shift()
    }
    console.log(`[协同编辑] ${event}`, details ? `- ${details}` : '')
  }

  let handleProviderStatus: ((event: any) => void) | null = null
  let handleProviderSync: ((synced: boolean) => void) | null = null
  let handleAwarenessChange: (() => void) | null = null

  /**
   * 更新协作者列表（带防抖）
   */
  const updateCollaborators = () => {
    if (isComponentDestroyed || isNil(provider.value)) return

    if (!isNil(updateCollaboratorsTimer)) {
      clearTimeout(updateCollaboratorsTimer)
    }

    updateCollaboratorsTimer = setTimeout(() => {
      if (isComponentDestroyed || isNil(provider.value)) return

      const states = provider.value.awareness.getStates()
      const userMap = new Map<string, Collaborator>()

      states.forEach((state: any, clientId: number) => {
        if (state.user) {
          const userId = state.user.id || `client_${clientId}`
          const isSelf = clientId === provider.value!.awareness.clientID

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

      const users = Array.from(userMap.values())

      users.sort((a, b) => {
        if (a.isSelf) return -1
        if (b.isSelf) return 1
        return 0
      })

      collaborators.value = users
      onCollaboratorsChange?.(users)
    }, 100)
  }

  /**
   * 初始化协同编辑
   */
  const initCollaboration = (initOptions: InitCollaborationOptions = {}) => {
    try {
      registerYjsErrorHandler()

      logConnectionEvent(
        '初始化开始',
        `文档: ${currentDocumentId}, 用户: ${user.name} (${user.id})`
      )

      hasShownConnectedMessage = false
      hasShownSyncedMessage = false
      connectedAtTimestamp = undefined

      ydoc.value = new Y.Doc()
      fragment.value = ydoc.value.getXmlFragment('default')

      logConnectionEvent('Y.Doc 初始化完成')

      const deviceId = user.deviceId || ''
      const tabId = user.tabId || ''
      logConnectionEvent('WebSocket 连接参数', `URL: ${wsUrl}, deviceId: ${deviceId || '未设置'}, tabId: ${tabId || '未设置'}`)

      const { autoConnect = true } = initOptions
      provider.value = new WebsocketProvider(wsUrl, currentDocumentId, ydoc.value, {
        connect: autoConnect,
        params: {
          documentId: currentDocumentId,
          userId: String(user.id),
          userName: user.name,
          userColor: user.color,
          deviceId,
          tabId
        }
      })

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

          const ws = (provider.value as any)?.ws
          if (ws && typeof ws.addEventListener === 'function') {
            ws.addEventListener('close', (ev: CloseEvent) => {
              if (ev.code === 4001) {
                logConnectionEvent('连接断开', ev.reason || '连接已关闭')
                provider.value?.disconnect()
                ElMessage.warning('协同连接已断开，请刷新页面重新连接')
              }
            })
          }
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

      provider.value.on('status', handleProviderStatus)
      provider.value.on('sync', handleProviderSync)
      provider.value.awareness.on('change', handleAwarenessChange)

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

      updateCollaborators()

      // sync 事件可能在注册监听器之前就已触发，需立即检查避免遗漏
      if (provider.value.synced && !isReady.value) {
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

    unregisterYjsErrorHandler()
    isComponentDestroyed = true

    if (syncTimeoutId) {
      clearTimeout(syncTimeoutId)
      syncTimeoutId = null
    }

    if (updateCollaboratorsTimer) {
      clearTimeout(updateCollaboratorsTimer)
      updateCollaboratorsTimer = null
    }

    if (provider.value) {
      try {
        if (handleAwarenessChange) {
          provider.value.awareness.off('change', handleAwarenessChange)
        }
        if (handleProviderStatus) {
          provider.value.off('status', handleProviderStatus)
        }
        if (handleProviderSync) {
          provider.value.off('sync', handleProviderSync)
        }
        provider.value.awareness.setLocalStateField('user', null)
      } catch (e) {
        console.warn('清理 provider 时出错:', e)
      }
      provider.value.destroy()
      provider.value = null
    }

    handleProviderStatus = null
    handleProviderSync = null
    handleAwarenessChange = null

    fragment.value = null

    if (ydoc.value) {
      try {
        ydoc.value.destroy()
      } catch (e) {
        console.warn('清理 ydoc 时出错:', e)
      }
      ydoc.value = null
    }

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
    cleanup()

    if (newDocumentId) {
      currentDocumentId = newDocumentId
    }

    if (newCreatorId !== undefined) {
      currentCreatorId = newCreatorId
    }

    isComponentDestroyed = false
    hasShownConnectedMessage = false
    hasShownSyncedMessage = false

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
