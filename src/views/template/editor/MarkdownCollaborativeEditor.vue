<template>
  <div class="markdown-collaborative-editor flex flex-col h-screen overflow-hidden bg-gray-100">
    <!-- 顶部状态栏 -->
    <EditorStatusBar
      :title="documentTitle"
      :create-time="docProperties.createTime"
      :update-time="docProperties.updateTime"
      :connection-status="connectionStatus"
      :is-review-mode="isReviewMode"
      :is-readonly="isReadonly"
      :is-saving="isSaving"
      @back="goBack"
      @save="handleSave"
      @submit-audit="handleSubmitAudit"
      @review-approve="handleReviewApprove"
      @review-reject="openReviewRejectDialog"
    />

    <!-- 主内容区域 -->
    <div class="flex-1 flex overflow-hidden relative">
      <!-- 编辑器容器 -->
      <div class="flex-1 flex flex-col overflow-hidden bg-gray-100 p-4">
        <div class="flex-1 bg-white rounded-lg shadow-sm overflow-hidden flex flex-col">
          <MarkdownEditor
            v-if="provider && ydoc"
            ref="markdownEditorRef"
            :ydoc="ydoc!"
            :provider="provider!"
            :user="currentUser"
            :title="documentTitle"
            :placeholder="'开始编写 ' + documentTitle + '...'"
            :loading="!isCollaborationReady"
            :editable="!isReadonly"
            @update="handleContentUpdate"
            @ready="handleEditorReady"
          />
        </div>
      </div>

      <!-- 右侧协同面板 (固定) -->
      <div class="w-[300px] flex-shrink-0 border-l border-gray-200 bg-white h-full z-10 shadow-sm">
        <CollaborationPanel
          mode="elements"
          :collaborators="collaborators"
          :elements="customElements"
          :properties="docProperties"
          default-role="编辑者"
        />
      </div>

      <!-- 驳回原因弹窗（审核模式） -->
      <el-dialog
        v-model="reviewRejectDialogVisible"
        title="驳回原因"
        width="500px"
        :close-on-click-modal="false"
        class="custom-dialog-header"
        append-to-body
      >
        <el-form label-position="top">
          <el-form-item label="请输入驳回原因" required>
            <el-input
              v-model="reviewRejectReason"
              type="textarea"
              :rows="6"
              placeholder="请输入驳回原因"
              resize="none"
            />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="reviewRejectDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleReviewRejectSubmit" :loading="reviewRejectLoading"
            >确认提交</el-button
          >
        </template>
      </el-dialog>
    </div>

    <!-- 审核流配置弹窗 -->
    <AuditFlowDialog
      v-model="auditDialogVisible"
      :document-id="documentId"
      :flow-list="auditFlowList"
      :user-options="userOptions"
      :loading="auditLoading"
      @submit="handleAuditSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { isNil, isEmpty } from 'lodash-es'
import dayjs from 'dayjs'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import AuditFlowDialog from '@/lmComponents/AuditFlowDialog/index.vue'
import CollaborationPanel from '@/lmComponents/collaboration/CollaborationPanel.vue'
import { EditorStatusBar } from '@/lmComponents/Editor'
import MarkdownEditor from './components/MarkdownEditor.vue'
import { useCollaborationUserStore } from '@/store/modules/collaborationUser'
import { defaultMarkdownConfig } from './config/markdownConfig'
import {
  saveMarkdownFile,
  submitAudit,
  examApply,
  getElementList,
  type MarkdownDocumentInfo,
  type SubmitAuditReqVO
} from './api/markdownApi'
import type { ElementItem } from '@/types/management'
import { htmlToMarkdown } from './utils/fileParser'

// Props
interface Props {
  docId?: string
}

const props = withDefaults(defineProps<Props>(), {
  docId: 'demo-template'
})

const router = useRouter()
const route = useRoute()
const collaborationUserStore = useCollaborationUserStore()

// 获取文档 ID - 优先使用路由参数 id，其次使用 props.docId
const documentId = computed(() => {
  return (route.params.id as string) || props.docId
})

// 获取协作用户信息（从 sessionStorage 中获取，确保刷新时用户一致）
const collaborationUser = collaborationUserStore.getOrCreateUser()
const currentUser = reactive({
  id: collaborationUser.id,
  name: collaborationUser.name,
  avatar: '',
  color: collaborationUser.color,
  role: '编辑者',
  joinTime: Date.now()
})

// 文档信息
const documentInfo = ref<MarkdownDocumentInfo | null>(null)
const documentTitle = computed(() => {
  return (route.query.title as string) || documentInfo.value?.title || '模板文档'
})

// Emits
const emit = defineEmits<{
  connectionChange: [status: string]
  collaboratorsChange: [users: any[]]
}>()

// 状态
const connectionStatus = ref('未连接')
const collaborators = ref<any[]>([])
const isCollaborationReady = ref(false)
const isSaving = ref(false)
const markdownEditorRef = ref<InstanceType<typeof MarkdownEditor> | null>(null)
const editorInstance = ref<any>(null)
let isComponentDestroyed = false // 标记组件是否已销毁
let hasShownConnectedMessage = false // 是否已显示连接成功消息
let hasShownSyncedMessage = false // 是否已显示同步完成消息

// 自定义要素
const customElements = ref<ElementItem[]>([])

// 文档属性 - 使用与 document 一致的格式
const docProperties = computed(() => ({
  createTime: documentInfo.value?.createTime
    ? dayjs(documentInfo.value.createTime).format('YYYY-MM-DD HH:mm:ss')
    : dayjs().format('YYYY-MM-DD HH:mm:ss'),
  updateTime: documentInfo.value?.updateTime
    ? dayjs(documentInfo.value.updateTime).format('YYYY-MM-DD HH:mm:ss')
    : dayjs().format('YYYY-MM-DD HH:mm:ss'),
  version: documentInfo.value?.version || 'V1.0',
  tags: documentInfo.value?.tags || []
}))

// 审核弹窗
const auditDialogVisible = ref(false)
const auditLoading = ref(false)

// 审核模式相关（从列表页点击"审核执行"进入）
const isReviewMode = computed(() => route.query.reviewMode === 'true')
const isReadonly = computed(() => route.query.readonly === 'true')
const reviewRejectDialogVisible = ref(false)
const reviewRejectLoading = ref(false)
const reviewRejectReason = ref('')

// 审核流程列表数据
const auditFlowList = [
  {
    flowId: 'flow1',
    flowName: '模板审批流1',
    nodes: [
      { nodeId: 'node1', nodeName: '节点1', users: [] as string[] },
      { nodeId: 'node2', nodeName: '节点2', users: ['user1', 'user2'] },
      { nodeId: 'node3', nodeName: '节点3', users: ['user5'] }
    ]
  },
  {
    flowId: 'flow2',
    flowName: '模板审批流2',
    nodes: [
      { nodeId: 'node1', nodeName: '节点1', users: [] as string[] },
      { nodeId: 'node2', nodeName: '节点2', users: [] as string[] }
    ]
  }
]

// 用户选项列表
const userOptions = [
  { label: 'user1', value: 'user1' },
  { label: 'user2', value: 'user2' },
  { label: 'user3', value: 'user3' },
  { label: 'user4', value: 'user4' },
  { label: 'user5', value: 'user5' }
]

// Yjs 和 WebSocket Provider
let ydoc: Y.Doc | null = null
let provider: WebsocketProvider | null = null
let syncTimeoutId: ReturnType<typeof setTimeout> | null = null // 用于清理 setTimeout

// 事件处理函数引用（用于正确移除事件监听器）
let handleProviderStatus: ((event: any) => void) | null = null
let handleProviderSync: ((synced: boolean) => void) | null = null
let handleAwarenessChange: (() => void) | null = null

// 返回
const goBack = () => {
  router.back()
}

// 内容更新回调
const handleContentUpdate = (_content: string) => {
  // 可以在这里做自动保存等操作
}

// 编辑器就绪回调
const handleEditorReady = async (editor: any) => {
  editorInstance.value = editor
  console.log('Markdown 编辑器已就绪')

  // 如果有初始内容，设置到编辑器中
  if (initialMarkdownContent.value) {
    console.log('设置初始 Markdown 内容到编辑器')
    // 使用 setTimeout 确保协同编辑已完全初始化
    setTimeout(() => {
      if (editor && initialMarkdownContent.value) {
        try {
          // 确保内容不为空，且是有效的 HTML
          const content = initialMarkdownContent.value.trim()
          if (content) {
            // 使用 setContent 并禁用发送更新，避免协同冲突
            editor.commands.setContent(content, false)
            console.log('初始内容已设置')
          }
        } catch (error) {
          console.error('设置初始内容失败:', error)
          // 如果设置失败，尝试设置一个空段落
          try {
            editor.commands.setContent('<p></p>', false)
          } catch (e) {
            console.error('设置空段落也失败:', e)
          }
        }
        // 清空初始内容，避免重复设置
        initialMarkdownContent.value = ''
      }
    }, 500)
  }
}

/**
 * 将 HTML 内容转换为 Markdown 文件的 Blob
 * @param htmlContent HTML 内容
 * @returns Blob 文件流（Markdown 格式，带 UTF-8 BOM）
 */
const htmlToMarkdownBlob = (htmlContent: string): Blob => {
  // 将 HTML 转换为 Markdown
  const markdownContent = htmlToMarkdown(htmlContent)

  // 使用 TextEncoder 将字符串转换为 UTF-8 字节数组
  const encoder = new TextEncoder()
  const contentBytes = encoder.encode(markdownContent)

  // UTF-8 BOM: 0xEF, 0xBB, 0xBF
  const bom = new Uint8Array([0xef, 0xbb, 0xbf])

  // 合并 BOM 和内容
  const blobContent = new Uint8Array(bom.length + contentBytes.length)
  blobContent.set(bom, 0)
  blobContent.set(contentBytes, bom.length)

  return new Blob([blobContent], {
    type: 'text/markdown'
  })
}

// 保存文档
const handleSave = async () => {
  if (isNil(editorInstance.value)) {
    ElMessage.warning('编辑器未就绪')
    return
  }

  isSaving.value = true
  try {
    // 获取编辑器的 HTML 内容
    const content = editorInstance.value.getHTML()

    // 将 HTML 内容转换为 Markdown 文件 Blob
    const blob = htmlToMarkdownBlob(content)

    console.log('保存文件，文档ID:', documentId.value, '文件大小:', blob.size, 'bytes')

    // 调用保存文档接口，使用 .md 后缀
    const result = await saveMarkdownFile(documentId.value, blob, `${documentTitle.value}.md`)

    if (result.code === 200 || result.status === 200) {
      ElMessage.success('文档已保存')

      // 更新文档信息
      if (documentInfo.value) {
        documentInfo.value.updateTime = new Date().toISOString()
      }
    } else {
      throw new Error(result.msg || '保存失败')
    }
  } catch (error) {
    console.error('保存文档失败:', error)
    ElMessage.error('保存失败: ' + (error as Error).message)
  } finally {
    isSaving.value = false
  }
}

// 打开提交审核弹窗
const handleSubmitAudit = () => {
  auditDialogVisible.value = true
}

// 提交审核
const handleAuditSubmit = async (data: SubmitAuditReqVO) => {
  auditLoading.value = true
  try {
    console.log('提交审核参数:', data)
    const result = await submitAudit(data)
    console.log('提交审核结果:', result)

    // 处理响应
    if (result && (result.code === 200 || result.code === 0)) {
      ElMessage.success(result.msg || '提交审核成功')
      auditDialogVisible.value = false
    } else {
      ElMessage.error(result?.msg || '提交审核失败')
    }
  } catch (error: any) {
    console.error('提交审核失败:', error)
    ElMessage.error(error.message || '提交审核失败')
  } finally {
    auditLoading.value = false
  }
}

// 审核通过（审核模式下）
const handleReviewApprove = async () => {
  try {
    await ElMessageBox.confirm('确认审核通过该模板吗？', '审核确认', {
      confirmButtonText: '确认提交',
      cancelButtonText: '取消',
      type: 'info'
    })

    // 获取当前用户ID
    const userId = currentUser.id || 'admin'

    const result = await examApply({
      applyId: documentId.value,
      examResult: '1', // 通过
      examOpinion: '',
      examUserId: userId
    })

    if (result && (result.code === 200 || result.code === 0)) {
      ElMessage.success(result.msg || '审核通过')
      // 返回列表页
      router.back()
    } else {
      ElMessage.error(result?.msg || '审核失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('审核失败:', error)
      ElMessage.error(error.message || '审核失败')
    }
  }
}

// 打开驳回弹窗（审核模式下）
const openReviewRejectDialog = () => {
  reviewRejectDialogVisible.value = true
  reviewRejectReason.value = ''
}

// 提交驳回（审核模式下）
const handleReviewRejectSubmit = async () => {
  if (isEmpty(reviewRejectReason.value.trim())) {
    ElMessage.warning('请输入驳回原因')
    return
  }

  reviewRejectLoading.value = true
  try {
    // 获取当前用户ID
    const userId = currentUser.id || 'admin'

    const result = await examApply({
      applyId: documentId.value,
      examResult: '2', // 驳回
      examOpinion: reviewRejectReason.value,
      examUserId: userId
    })

    if (result && (result.code === 200 || result.code === 0)) {
      ElMessage.success(result.msg || '驳回成功')
      reviewRejectDialogVisible.value = false
      // 返回列表页
      router.back()
    } else {
      ElMessage.error(result?.msg || '驳回失败')
    }
  } catch (error: any) {
    console.error('驳回失败:', error)
    ElMessage.error(error.message || '驳回失败')
  } finally {
    reviewRejectLoading.value = false
  }
}

// 初始化协同编辑
const initCollaboration = () => {
  try {
    // 重置消息标志
    hasShownConnectedMessage = false
    hasShownSyncedMessage = false

    // 初始化 Y.Doc
    ydoc = new Y.Doc()

    // 构建 WebSocket URL - 使用独立的 /markdown 路径
    const baseWsUrl = defaultMarkdownConfig.wsUrl

    // 初始化 WebSocket Provider
    provider = new WebsocketProvider(baseWsUrl, documentId.value, ydoc, {
      connect: true,
      params: {
        documentId: documentId.value,
        userId: String(currentUser.id),
        userName: currentUser.name,
        userColor: currentUser.color
      }
    })

    // 定义事件处理函数（保存引用以便后续移除）
    handleProviderStatus = (event: any) => {
      // 如果组件已销毁，不执行任何操作
      if (isComponentDestroyed) return

      const status = event.status

      if (status === 'disconnected') {
        connectionStatus.value = '连接断开'
        // 断开后重置消息标志，以便重连时能再次显示
        hasShownConnectedMessage = false
        hasShownSyncedMessage = false
      } else if (status === 'connected') {
        connectionStatus.value = '已连接'
        // 只显示一次连接成功消息
        if (!hasShownConnectedMessage) {
          hasShownConnectedMessage = true
          ElMessage.success('已连接到协同服务')
        }
        // 连接成功后更新协作者列表
        updateCollaborators()
      } else if (status === 'connecting') {
        connectionStatus.value = '连接中...'
      }

      emit('connectionChange', connectionStatus.value)
    }

    handleProviderSync = (synced: boolean) => {
      // 如果组件已销毁，不执行任何操作
      if (isComponentDestroyed) return

      if (synced && !hasShownSyncedMessage) {
        hasShownSyncedMessage = true
        // 同步完成后标记协同编辑就绪
        isCollaborationReady.value = true
        // 同步完成后更新协作者列表
        updateCollaborators()
      }
    }

    handleAwarenessChange = () => {
      // 如果组件已销毁，不执行任何操作
      if (isComponentDestroyed) return
      updateCollaborators()
    }

    // 监听连接状态
    provider.on('status', handleProviderStatus)

    // 监听同步状态
    provider.on('sync', handleProviderSync)

    // 监听感知信息（在线用户）
    provider.awareness.on('change', handleAwarenessChange)

    // 设置当前用户状态到 awareness
    const userState = {
      id: currentUser.id,
      name: currentUser.name,
      color: currentUser.color,
      avatar: currentUser.avatar,
      role: currentUser.role,
      joinTime: currentUser.joinTime
    }
    provider.awareness.setLocalStateField('user', userState)

    // 立即更新一次协作者列表
    updateCollaborators()

    // 如果连接已建立但还没有收到 sync 事件，设置超时
    syncTimeoutId = setTimeout(() => {
      // 如果组件已销毁，不执行任何操作
      if (isComponentDestroyed) return

      if (!isCollaborationReady.value && provider?.wsconnected) {
        isCollaborationReady.value = true
      }
    }, 2000)
  } catch (error) {
    console.error('协同编辑初始化失败:', error)
    ElMessage.error('协同编辑初始化失败: ' + (error as Error).message)
  }
}

// 更新协作者列表（带防抖）
let updateCollaboratorsTimer: ReturnType<typeof setTimeout> | null = null
const updateCollaborators = () => {
  // 如果组件已销毁或 provider 不存在，不执行任何操作
  if (isComponentDestroyed || isNil(provider)) return

  // 防抖：避免频繁更新
  if (!isNil(updateCollaboratorsTimer)) {
    clearTimeout(updateCollaboratorsTimer)
  }

  updateCollaboratorsTimer = setTimeout(() => {
    if (isComponentDestroyed || isNil(provider)) return

    const states = provider.awareness.getStates()
    // 使用 Map 按用户 ID 去重，保留最新的连接
    const userMap = new Map<string, any>()

    states.forEach((state: any, clientId: number) => {
      if (state.user) {
        // 使用用户ID去重，如果没有ID则使用clientId
        const userId = state.user.id || `client_${clientId}`
        const isSelf = clientId === provider!.awareness.clientID

        // 如果是自己，优先使用；否则只在没有记录时添加
        if (isSelf || !userMap.has(userId)) {
          userMap.set(userId, {
            clientId,
            ...state.user,
            isSelf,
            isOwner: state.user.id === documentInfo.value?.creatorId
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
    emit('collaboratorsChange', users)
  }, 100) // 100ms 防抖
}

/**
 * Base64 转文本工具函数
 * @param base64 Base64 字符串 (data URL 格式)
 * @returns 解码后的文本内容
 */
const base64ToText = async (base64: string): Promise<string> => {
  try {
    // 从 data URL 提取 base64 数据
    const base64Data = base64.split(',')[1]
    if (isEmpty(base64Data)) {
      console.warn('无效的 base64 数据格式')
      return ''
    }

    // 解码 base64 为二进制
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // 使用 TextDecoder 解码为 UTF-8 文本
    const decoder = new TextDecoder('utf-8')
    return decoder.decode(bytes)
  } catch (error) {
    console.error('Base64 解码失败:', error)
    return ''
  }
}

/**
 * 将普通 Markdown 内容转换为 HTML（不包含红头文件标记）
 * @param content Markdown 内容
 * @returns HTML 内容
 */
const convertMarkdownContent = (content: string): string => {
  if (!content || content.trim() === '') return ''

  // 提取并保护特殊内容，防止被错误转义
  const placeholders: { placeholder: string; html: string }[] = []
  let placeholderIndex = 0

  // 处理代码块 ```language\ncode\n```
  let html = content.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    const placeholder = `XYZPLACEHOLDER${placeholderIndex}XYZ`
    const escapedCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const langClass = lang ? ` class="language-${lang}"` : ''
    placeholders.push({
      placeholder,
      html: `<pre><code${langClass}>${escapedCode}</code></pre>`
    })
    placeholderIndex++
    return placeholder
  })

  // 处理 AI 模块标记 ==AI[内容]AI==
  html = html.replace(/==AI\[([\s\S]*?)\]AI==/g, (_match, aiContent) => {
    const placeholder = `XYZPLACEHOLDER${placeholderIndex}XYZ`
    placeholders.push({
      placeholder,
      html: `<span data-type="ai-block" class="ai-block">${aiContent}</span>`
    })
    placeholderIndex++
    return placeholder
  })

  // 处理图片 ![alt](url)
  html = html.replace(/!\[((?:[^\[\]]|\[[^\]]*\])*)\]\(([^)]+)\)/g, (_match, alt, url) => {
    const placeholder = `XYZPLACEHOLDER${placeholderIndex}XYZ`
    placeholders.push({
      placeholder,
      html: `<img src="${url}" alt="${alt}" style="max-width: 100%; height: auto;" />`
    })
    placeholderIndex++
    return placeholder
  })

  // 处理 Markdown 链接 [text](url)
  html = html.replace(/\[((?:[^\[\]]|\[[^\]]*\])+)\]\(([^)]+)\)/g, (_match, text, url) => {
    const placeholder = `XYZPLACEHOLDER${placeholderIndex}XYZ`
    placeholders.push({
      placeholder,
      html: `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-500 underline cursor-pointer">${text}</a>`
    })
    placeholderIndex++
    return placeholder
  })

  html = html
    // 转义 HTML 特殊字符
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // 标题
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // 粗体和斜体
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // 行内代码
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // 删除线
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
    // 水平线
    .replace(/^---$/gm, '<hr>')
    .replace(/^\*\*\*$/gm, '<hr>')
    // 引用
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // 无序列表
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^\* (.+)$/gm, '<li>$1</li>')
    // 有序列表
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // 自动链接裸 URL
    .replace(/(\(|（)?(https?:\/\/[^\s<>]+)(\)|）)?/g, (_m, l, url, r) => {
      const left = l || ''
      const right = r || ''
      return `${left}<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-500 underline cursor-pointer">${url}</a>${right}`
    })
    // 段落
    .replace(/\n\n/g, '</p><p>')

  // 包裹在段落中
  html = '<p>' + html + '</p>'

  // 清理多余的空段落
  html = html.replace(/<p><\/p>/g, '')
  html = html.replace(/<p>(<h[1-6]>)/g, '$1')
  html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1')
  html = html.replace(/<p>(<hr>)<\/p>/g, '$1')
  html = html.replace(/<p>(<blockquote>)/g, '$1')
  html = html.replace(/(<\/blockquote>)<\/p>/g, '$1')
  html = html.replace(/<p>(<li>)/g, '<ul>$1')
  html = html.replace(/(<\/li>)<\/p>/g, '$1</ul>')
  html = html.replace(/<p>(XYZPLACEHOLDER\d+XYZ)<\/p>/g, '$1') // 清理代码块周围的段落

  // 合并连续的列表项
  html = html.replace(/<\/ul><ul>/g, '')

  // 恢复占位符内容
  placeholders.forEach((item) => {
    html = html.replace(item.placeholder, item.html)
  })

  return html
}

/**
 * Markdown 转 HTML
 * 支持红头文件标记块 <!-- REDHEADER:type -->...<!-- /REDHEADER -->
 * @param markdown Markdown 文本
 * @returns HTML 内容
 */
const markdownToHtml = (markdown: string): string => {
  if (isEmpty(markdown)) return ''

  // 调试：打印原始 Markdown 内容
  console.log('markdownToHtml 输入内容前100字符:', markdown.substring(0, 100))
  console.log('是否包含 REDHEADER 标记:', markdown.includes('<!-- REDHEADER:'))

  // 检查是否包含红头文件标记（更宽松的正则，允许空格和换行）
  const redHeaderPattern = /<!--\s*REDHEADER:(\w+)\s*-->\s*([\s\S]*?)\s*<!--\s*\/REDHEADER\s*-->/
  const match = markdown.match(redHeaderPattern)

  if (match) {
    console.log('检测到红头文件标记，类型:', match[1])
    // 提取红头文件 HTML 和剩余内容
    const redHeaderHtml = match[2].trim()
    const restContent = markdown.replace(redHeaderPattern, '').trim()

    console.log('红头文件 HTML 长度:', redHeaderHtml.length)
    console.log('剩余内容长度:', restContent.length)

    // 转换剩余内容为 HTML
    const restHtml = restContent ? convertMarkdownContent(restContent) : ''

    // 组合红头文件 HTML 和剩余内容
    const result = (redHeaderHtml + restHtml).trim()
    console.log('组合后 HTML 长度:', result.length)
    return result
  }

  console.log('未检测到红头文件标记，使用普通转换')
  // 没有红头文件标记，使用普通转换
  return convertMarkdownContent(markdown)
}

// 初始 Markdown 内容（用于编辑器初始化后设置）
const initialMarkdownContent = ref<string>('')

// 加载文档数据
const loadDocument = async () => {
  try {
    // 从 sessionStorage 获取文档信息（由 template 页面传递）
    const cachedDocInfoKey = `markdown_info_${documentId.value}`
    const cachedDocInfo = sessionStorage.getItem(cachedDocInfoKey)

    if (cachedDocInfo) {
      documentInfo.value = JSON.parse(cachedDocInfo) as MarkdownDocumentInfo
      console.log('从缓存加载文档信息:', documentInfo.value)
    } else {
      // 如果没有缓存的文档信息，使用默认值
      const now = new Date().toISOString()
      documentInfo.value = {
        id: documentId.value,
        title: (route.query.title as string) || '新模板',
        content: '',
        createTime: now,
        updateTime: now,
        version: 'V1.0',
        tags: [],
        creatorId: 0,
        creatorName: '未知'
      }
      console.log('使用默认文档信息:', documentInfo.value)
    }

    // 从 sessionStorage 获取 Markdown 内容（由 management 页面传递）
    const hasContent = route.query.hasContent === 'true'
    if (hasContent) {
      const cachedContentKey = `markdown_content_${documentId.value}`
      const cachedContent = sessionStorage.getItem(cachedContentKey)

      if (cachedContent) {
        console.log('从缓存加载 Markdown 内容')
        // 将 base64 解码为文本
        const markdownText = await base64ToText(cachedContent)
        console.log('解码后的 Markdown 内容长度:', markdownText.length)
        console.log('Markdown 内容前200字符:', markdownText.substring(0, 200))

        if (markdownText) {
          // 将 Markdown 转换为 HTML
          const htmlContent = markdownToHtml(markdownText)
          console.log('转换后的 HTML 内容长度:', htmlContent.length)

          // 存储初始内容，等编辑器就绪后设置
          initialMarkdownContent.value = htmlContent
        }

        // 清除缓存（一次性使用）
        sessionStorage.removeItem(cachedContentKey)
      }
    }

    // 加载自定义要素
    customElements.value = await getElementList(documentId.value)
  } catch (error) {
    console.error('加载文档失败:', error)
    // 确保即使出错也有默认值
    const now = new Date().toISOString()
    documentInfo.value = {
      id: documentId.value,
      title: (route.query.title as string) || '新模板',
      content: '',
      createTime: now,
      updateTime: now,
      version: 'V1.0',
      tags: [],
      creatorId: 0,
      creatorName: '未知'
    }
  }
}

// 监听文档ID变化
watch(
  () => documentId.value,
  () => {
    // 重新初始化
    if (provider) {
      provider.destroy()
    }
    if (ydoc) {
      ydoc.destroy()
    }
    isCollaborationReady.value = false
    loadDocument()
    initCollaboration()
  }
)

// 组件挂载
onMounted(async () => {
  loadDocument()
  initCollaboration()
})

// 组件卸载 - 完善的内存泄漏防护
onBeforeUnmount(() => {
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

  // 清理编辑器实例引用
  editorInstance.value = null
  markdownEditorRef.value = null

  // 销毁 WebSocket Provider
  if (provider) {
    try {
      // 移除所有事件监听器（使用保存的函数引用）
      if (handleAwarenessChange) {
        provider.awareness.off('change', handleAwarenessChange)
      }
      if (handleProviderStatus) {
        provider.off('status', handleProviderStatus)
      }
      if (handleProviderSync) {
        provider.off('sync', handleProviderSync)
      }
      // 移除用户状态
      provider.awareness.setLocalStateField('user', null)
    } catch (e) {
      // 忽略销毁时的错误
      console.warn('清理 provider 时出错:', e)
    }
    provider.destroy()
    provider = null
  }

  // 清理事件处理函数引用
  handleProviderStatus = null
  handleProviderSync = null
  handleAwarenessChange = null

  // 销毁 Y.Doc
  if (ydoc) {
    try {
      ydoc.destroy()
    } catch (e) {
      console.warn('清理 ydoc 时出错:', e)
    }
    ydoc = null
  }

  // 清理其他响应式引用
  collaborators.value = []
  customElements.value = []
  documentInfo.value = null
  initialMarkdownContent.value = ''

  console.log('Markdown 协同编辑组件已清理')
})
</script>

<style lang="scss" scoped>
// 抽屉动画
:deep(.material-drawer) {
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.05);
}
</style>

<style lang="scss">
// 引入自定义弹窗样式
@use '@/lmStyles/dialog.scss';

// 全局样式：让无遮罩的 drawer 不阻挡编辑器操作
// 由于 append-to-body，需要用全局样式
.material-drawer-overlay {
  // overlay/wrapper 不要拦截鼠标事件，确保编辑器可点
  pointer-events: none;
  background-color: transparent !important;

  .el-drawer__wrapper {
    pointer-events: none;
  }

  .el-drawer {
    pointer-events: auto;
  }
}
</style>
