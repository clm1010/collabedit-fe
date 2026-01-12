import { ref, onBeforeUnmount, type Ref } from 'vue'
import { ElMessage } from 'element-plus'
import { isNil } from 'lodash-es'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

/**
 * 协作用户信息
 */
export interface CollaborationUser {
  id: string
  name: string
  color: string
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
 * useCollaboration 返回值
 */
export interface UseCollaborationReturn {
  /** Yjs 文档实例 */
  ydoc: Ref<Y.Doc | null>
  /** WebSocket Provider 实例 */
  provider: Ref<WebsocketProvider | null>
  /** 连接状态 */
  connectionStatus: Ref<string>
  /** 协作者列表 */
  collaborators: Ref<Collaborator[]>
  /** 是否协同就绪 */
  isReady: Ref<boolean>
  /** 初始化协同编辑 */
  initCollaboration: () => void
  /** 清理协同资源 */
  cleanup: () => void
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
    documentId,
    wsUrl,
    user,
    creatorId,
    showConnectMessage = true,
    onConnectionChange,
    onCollaboratorsChange,
    onSynced
  } = options

  // 响应式状态
  const ydoc = ref<Y.Doc | null>(null)
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
              isOwner: creatorId !== undefined && state.user.id === creatorId
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
  const initCollaboration = () => {
    try {
      // 重置消息标志
      hasShownConnectedMessage = false
      hasShownSyncedMessage = false

      // 初始化 Y.Doc
      ydoc.value = new Y.Doc()

      // 初始化 WebSocket Provider
      provider.value = new WebsocketProvider(wsUrl, documentId, ydoc.value, {
        connect: true,
        params: {
          documentId: documentId,
          userId: String(user.id),
          userName: user.name,
          userColor: user.color
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
        } else if (status === 'connected') {
          connectionStatus.value = '已连接'
          if (showConnectMessage && !hasShownConnectedMessage) {
            hasShownConnectedMessage = true
            ElMessage.success('已连接到协同服务')
          }
          updateCollaborators()
        } else if (status === 'connecting') {
          connectionStatus.value = '连接中...'
        }

        onConnectionChange?.(connectionStatus.value)
      }

      handleProviderSync = (synced: boolean) => {
        if (isComponentDestroyed) return

        if (synced && !hasShownSyncedMessage) {
          hasShownSyncedMessage = true
          isReady.value = true
          updateCollaborators()
          onSynced?.()
        }
      }

      handleAwarenessChange = () => {
        if (isComponentDestroyed) return
        updateCollaborators()
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
        avatar: user.avatar || '',
        role: user.role || '编辑者',
        joinTime: user.joinTime || Date.now()
      }
      provider.value.awareness.setLocalStateField('user', userState)

      // 立即更新一次协作者列表
      updateCollaborators()

      // 如果连接已建立但还没有收到 sync 事件，设置超时
      syncTimeoutId = setTimeout(() => {
        if (isComponentDestroyed) return

        if (!isReady.value && provider.value?.wsconnected) {
          isReady.value = true
        }
      }, 2000)
    } catch (error) {
      console.error('协同编辑初始化失败:', error)
      ElMessage.error('协同编辑初始化失败: ' + (error as Error).message)
    }
  }

  /**
   * 清理协同资源
   */
  const cleanup = () => {
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

  // 组件卸载时自动清理
  onBeforeUnmount(() => {
    cleanup()
  })

  return {
    ydoc,
    provider,
    connectionStatus,
    collaborators,
    isReady,
    initCollaboration,
    cleanup
  }
}

export default useCollaboration
