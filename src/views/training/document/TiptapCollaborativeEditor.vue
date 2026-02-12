<template>
  <div class="tiptap-collaborative-editor flex flex-col h-screen overflow-hidden bg-gray-100">
    <!-- 顶部状态栏 -->
    <EditorStatusBar
      :title="documentTitle"
      :create-time="docProperties.createTime"
      :update-time="docProperties.updateTime"
      :connection-status="connectionStatus"
      :is-review-mode="isReviewMode"
      :is-readonly="isReadonly"
      :is-saving="isSaving"
      :has-unsaved-changes="hasUnsavedChanges"
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
          <!-- 协同编辑器：只要 ydoc/fragment/provider 就绪即可渲染 -->
          <TiptapEditor
            v-if="provider && ydoc && fragment"
            ref="tiptapEditorRef"
            :ydoc="ydoc!"
            :fragment="fragment!"
            :provider="provider!"
            :user="currentUser"
            :title="documentTitle"
            :placeholder="'开始编写 ' + documentTitle + '...'"
            :loading="false"
            :content-loading="!isContentReady"
            :editable="!isReadonly"
            @update="handleContentUpdate"
            @ready="handleEditorReady"
          />
          <!-- provider/ydoc/fragment 同步创建，此处仅存在一帧，用空白占位即可 -->
          <div v-else class="h-full bg-gray-100"></div>
        </div>
      </div>

      <!-- 右侧协同面板 (固定) -->
      <div class="w-[300px] flex-shrink-0 border-l border-gray-200 bg-white h-full z-10 shadow-sm">
        <CollaborationPanel
          mode="materials"
          :collaborators="collaborators"
          :materials="referenceMaterials"
          :properties="docProperties"
          default-role="查看者"
          @click-material="handleMaterialClick"
        />
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

      <!-- 参考素材抽屉 (无遮罩，从协同面板左侧滑出) -->
      <el-drawer
        v-model="drawerVisible"
        :title="currentMaterial?.title || '参考素材'"
        :modal="false"
        :lock-scroll="false"
        :append-to-body="true"
        modal-class="material-drawer-overlay"
        :close-on-click-modal="false"
        direction="rtl"
        class="material-drawer custom-drawer-header"
        :show-close="true"
        :style="{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '500px',
          height: '100%'
        }"
      >
        <div v-if="currentMaterial" class="h-full flex flex-col">
          <div class="text-xs text-gray-400 mb-4 flex justify-between">
            <span>发布时间: {{ currentMaterial.date }}</span>
            <span>作者: {{ currentMaterial.author }}</span>
          </div>
          <div
            class="prose prose-sm flex-1 overflow-y-auto border p-3 rounded bg-gray-50 mb-4"
            v-html="currentMaterial.content"
          ></div>
          <div class="flex justify-end gap-2">
            <el-button type="primary" @click="copyContent(currentMaterial.content)">
              复制内容
            </el-button>
            <el-button @click="drawerVisible = false">关闭</el-button>
          </div>
        </div>
      </el-drawer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { isNil, isEmpty } from 'lodash-es'
import dayjs from 'dayjs'
import { createNodeFromContent } from '@tiptap/core'
import { Selection } from '@tiptap/pm/state'
import AuditFlowDialog from '@/lmComponents/AuditFlowDialog/index.vue'
import CollaborationPanel from '@/lmComponents/collaboration/CollaborationPanel.vue'
import { EditorStatusBar } from '@/lmComponents/Editor'
import TiptapEditor from './components/TiptapEditor.vue'
import { useCollaborationUserStore } from '@/store/modules/collaborationUser'
import { useCollaboration } from '@/lmHooks'
import { defaultCollaborationConfig } from './config/editorConfig'
import {
  getReferenceMaterials,
  saveDocumentFile,
  submitAudit,
  examApply,
  type DocumentInfo,
  type SubmitAuditReqVO
} from './api/documentApi'
import {
  docModelToDocx,
  normalizeHtmlThroughDocModel,
  parseFileContent,
  parseHtmlToDocModel,
  ImageStore
} from './utils/wordParser'
import { useDocBufferStore } from '@/store/modules/docBuffer'
import { getFileStream as getFileStreamApi } from '@/api/training'
import { restoreBlobImagesFromOriginAsync } from '@/views/utils/fileUtils'
import { hasStyleHintsInHtml, sanitizeImagesIfNeeded } from './utils/wordParser.shared'
import { logger } from '@/views/utils/logger'

// ==================== IndexedDB 文档解析缓存工具 ====================
// 使用浏览器原生 IndexedDB 缓存成功解析的带样式 HTML，关闭浏览器后仍保留
const DOC_CACHE_DB_NAME = 'docParseCache'
const DOC_CACHE_STORE_NAME = 'parsedHtml'
const DOC_CACHE_VERSION = 1
const DOC_CACHE_EXPIRE_MS = 7 * 24 * 60 * 60 * 1000 // 7 天过期

interface DocCacheEntry {
  html: string
  timestamp: number
  size: number
}

/** 打开 IndexedDB 数据库 */
const openDocCacheDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DOC_CACHE_DB_NAME, DOC_CACHE_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(DOC_CACHE_STORE_NAME)) {
        db.createObjectStore(DOC_CACHE_STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** 从 IndexedDB 获取缓存的解析结果 */
const getDocCache = async (docId: string): Promise<string | null> => {
  try {
    const db = await openDocCacheDB()
    return new Promise((resolve) => {
      const tx = db.transaction(DOC_CACHE_STORE_NAME, 'readonly')
      const store = tx.objectStore(DOC_CACHE_STORE_NAME)
      const request = store.get(docId)
      request.onsuccess = () => {
        const entry = request.result as DocCacheEntry | undefined
        if (entry && Date.now() - entry.timestamp < DOC_CACHE_EXPIRE_MS) {
          logger.debug('[DocCache] 命中 IndexedDB 缓存, docId:', docId, 'size:', entry.size)
          resolve(entry.html)
        } else {
          if (entry) {
            // 缓存已过期，清理
            void deleteDocCache(docId)
          }
          resolve(null)
        }
      }
      request.onerror = () => resolve(null)
      tx.oncomplete = () => db.close()
    })
  } catch (e) {
    logger.warn('[DocCache] 读取 IndexedDB 失败:', e)
    return null
  }
}

/** 将解析结果存入 IndexedDB */
const setDocCache = async (docId: string, html: string): Promise<void> => {
  try {
    const db = await openDocCacheDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DOC_CACHE_STORE_NAME, 'readwrite')
      const store = tx.objectStore(DOC_CACHE_STORE_NAME)
      const entry: DocCacheEntry = {
        html,
        timestamp: Date.now(),
        size: html.length
      }
      store.put(entry, docId)
      tx.oncomplete = () => {
        logger.debug('[DocCache] 已缓存到 IndexedDB, docId:', docId, 'size:', html.length)
        db.close()
        resolve()
      }
      tx.onerror = () => {
        db.close()
        reject(tx.error)
      }
    })
  } catch (e) {
    logger.warn('[DocCache] 写入 IndexedDB 失败:', e)
  }
}

/** 删除指定文档的缓存 */
const deleteDocCache = async (docId: string): Promise<void> => {
  try {
    const db = await openDocCacheDB()
    const tx = db.transaction(DOC_CACHE_STORE_NAME, 'readwrite')
    tx.objectStore(DOC_CACHE_STORE_NAME).delete(docId)
    tx.oncomplete = () => db.close()
  } catch {
    // 删除失败可忽略
  }
}

/** 清理所有过期缓存 */
const cleanExpiredDocCache = async (): Promise<void> => {
  try {
    const db = await openDocCacheDB()
    const tx = db.transaction(DOC_CACHE_STORE_NAME, 'readwrite')
    const store = tx.objectStore(DOC_CACHE_STORE_NAME)
    const request = store.openCursor()
    request.onsuccess = () => {
      const cursor = request.result
      if (cursor) {
        const entry = cursor.value as DocCacheEntry
        if (Date.now() - entry.timestamp >= DOC_CACHE_EXPIRE_MS) {
          cursor.delete()
        }
        cursor.continue()
      }
    }
    tx.oncomplete = () => db.close()
  } catch {
    // 清理失败可忽略
  }
}
// ==================== IndexedDB 工具函数结束 ====================

// Props
interface Props {
  docId?: string
}

const props = withDefaults(defineProps<Props>(), {
  docId: 'demo-doc'
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
  deviceId: collaborationUser.deviceId,
  tabId: collaborationUser.tabId,
  role: '编辑者',
  joinTime: Date.now()
})

// 文档信息
const documentInfo = ref<DocumentInfo | null>(null)
const documentTitle = computed(() => {
  return (route.query.title as string) || documentInfo.value?.title || '协同文档'
})

// Emits
const emit = defineEmits<{
  connectionChange: [status: string]
  collaboratorsChange: [users: any[]]
}>()

// 使用协同编辑 Hook
const {
  ydoc,
  fragment,
  provider,
  connectionStatus,
  collaborators,
  isReady: isCollaborationReady,
  initCollaboration,
  reinitialize: reinitializeCollaboration
} = useCollaboration({
  documentId: documentId.value,
  wsUrl: defaultCollaborationConfig.wsUrl,
  user: currentUser,
  creatorId: undefined, // 将在 loadDocument 后更新
  showConnectMessage: true,
  onConnectionChange: (status) => emit('connectionChange', status),
  onCollaboratorsChange: (users) => emit('collaboratorsChange', users),
  onSynced: () => {
    isCollaborationSynced.value = true
    tryApplyPreloadedContent()
  }
})

// 状态
const isSaving = ref(false)
const tiptapEditorRef = ref<InstanceType<typeof TiptapEditor> | null>(null)
const editorInstance = ref<any>(null)

// 预加载的文档内容（从权限校验接口获取的文件流）
const preloadedContent = ref<string>('')
const preloadedApplied = ref(false)
const preloadedCacheCleared = ref(false)
// 标记是否为首次加载（有预加载内容的情况）
const isFirstLoadWithContent = ref(false)
// 编辑器和协同同步状态
const isEditorReady = ref(false)
const isCollaborationSynced = ref(false)
// 用于清理 setTimeout 的 timer ID 集合
const pendingTimers = ref<Set<ReturnType<typeof setTimeout>>>(new Set())
// 组件是否已卸载的标记
const isUnmounted = ref(false)
// 自动保存相关状态
const autoSaveTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const lastSavedContentHash = ref<string>('')
const isAutoSaving = ref(false)
const hasUserEdited = ref(false) // 标记用户是否真的编辑过（避免首次加载触发保存）
const hasUnsavedChanges = ref(false) // 文档是否有未保存的更改

// 内容是否真正加载完成（控制子组件骨架屏）
const isContentReady = computed(() => {
  // 预加载内容已应用（含"编辑器已有协同内容，跳过预加载"的情况）
  if (preloadedApplied.value) return true
  // 协同已同步 且 没有需要应用的预加载内容（空文档 / 仅靠协同同步的文档）
  if (isCollaborationSynced.value && !preloadedContent.value) return true
  return false
})

// 参考素材
const referenceMaterials = ref<any[]>([])

// 文档属性 - 使用与 performance mockData 一致的格式
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

// 抽屉状态
const drawerVisible = ref(false)
const currentMaterial = ref<any>(null)

// 审核弹窗相关
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
    flowName: '演训筹划文档审批流1',
    nodes: [
      { nodeId: 'node1', nodeName: '节点1', users: [] as string[] },
      { nodeId: 'node2', nodeName: '节点2', users: ['user1', 'user2'] },
      { nodeId: 'node3', nodeName: '节点3', users: ['user5'] },
      { nodeId: 'node4', nodeName: '节点4', users: ['user4'] }
    ]
  },
  {
    flowId: 'flow2',
    flowName: '演训筹划文档审批流2',
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

// 处理素材点击
const handleMaterialClick = (item: any) => {
  currentMaterial.value = item
  drawerVisible.value = true
}

// 复制内容
const copyContent = (html: string) => {
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = html
  const text = tempDiv.innerText || tempDiv.textContent || ''

  navigator.clipboard
    .writeText(text)
    .then(() => {
      ElMessage.success('内容已复制到剪贴板')
    })
    .catch(() => {
      ElMessage.error('复制失败')
    })
}

// 返回
const goBack = () => {
  router.back()
}

// 打开提交审核弹窗
const handleSubmitAudit = () => {
  auditDialogVisible.value = true
}

// 提交审核
const handleAuditSubmit = async (data: SubmitAuditReqVO) => {
  auditLoading.value = true
  try {
    logger.debug('提交审核参数:', data)
    const result = await submitAudit(data)
    logger.debug('提交审核结果:', result)

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
    await ElMessageBox.confirm('确认审核通过该文档吗？', '审核确认', {
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
      examuserId: userId
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
      examuserId: userId
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

// 简单的内容哈希函数
const getContentHash = (content: string): string => {
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return hash.toString()
}

// 执行自动保存
const performAutoSave = async () => {
  if (isUnmounted.value || !editorInstance.value || isAutoSaving.value || isSaving.value) return

  const currentContent = editorInstance.value.getHTML()
  const currentHash = getContentHash(currentContent)

  // 检查内容是否有变化
  if (currentHash === lastSavedContentHash.value) {
    logger.debug('[自动保存] 内容无变化，跳过保存')
    return
  }

  isAutoSaving.value = true
  logger.debug('[自动保存] 开始保存...')

  try {
    await handleSave()
    lastSavedContentHash.value = currentHash
    logger.debug('[自动保存] 保存成功')
  } catch (error) {
    console.error('[自动保存] 保存失败:', error)
  } finally {
    isAutoSaving.value = false
  }
}

// 内容更新回调 - 触发自动保存（防抖3秒）
const handleContentUpdate = (_content: string) => {
  // 标记用户已编辑
  if (!hasUserEdited.value && preloadedApplied.value) {
    hasUserEdited.value = true
  }

  // 首次加载完成前不触发自动保存
  if (!hasUserEdited.value) return

  // 标记有未保存的更改
  hasUnsavedChanges.value = true

  // 只读模式不触发自动保存
  if (isReadonly.value) return

  // 清除之前的自动保存定时器
  if (autoSaveTimer.value) {
    clearTimeout(autoSaveTimer.value)
  }

  // 设置新的自动保存定时器（3秒防抖）
  autoSaveTimer.value = setTimeout(() => {
    if (!isUnmounted.value) {
      performAutoSave()
    }
  }, 3000)
}

const clearPreloadedCache = () => {
  if (preloadedCacheCleared.value) return
  preloadedCacheCleared.value = true
  const docBufferStore = useDocBufferStore()
  docBufferStore.clearBuffer()
}

const escapeHtml = (text: string) => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const normalizePreloadedHtml = (html: string) => {
  const trimmed = (html || '').trim()
  if (!trimmed) return '<p></p>'

  const textblockTags = new Set([
    'p',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'blockquote',
    'pre',
    'li'
  ])
  const emptyParagraph = '<p></p>'
  let result = trimmed

  if (!/^\s*</.test(trimmed)) {
    result = `<p>${trimmed}</p>`
  } else {
    const match = trimmed.match(/^<([a-zA-Z0-9-]+)/)
    const firstTag = match ? match[1].toLowerCase() : ''
    if (firstTag && !textblockTags.has(firstTag)) {
      result = `${emptyParagraph}${trimmed}`
    }
  }

  if (!/<p>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>\s*$/i.test(result)) {
    result = `${result}${emptyParagraph}`
  }

  return result
}

const imageStore = new ImageStore()

const replaceDataImagesWithBlobUrls = async (html: string) => {
  if (!html) return html
  if (!/data:image\//i.test(html)) return html
  return imageStore.replaceDataImagesWithBlobUrls(html)
}

// 可清理的异步延迟（组件卸载时自动取消）
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    const id = setTimeout(() => {
      pendingTimers.value.delete(id)
      resolve()
    }, ms)
    pendingTimers.value.add(id)
  })

// 检测编辑器是否为空（只有空段落或纯空白）
// 注意：含图片/表格等非文本元素的文档不算空
const isEditorContentEmpty = (html: string): boolean => {
  if (!html) return true
  if (html === '<p></p>' || html === '<p><br></p>') return true
  if (html === '<p><br class="ProseMirror-trailingBreak"></p>') return true
  // 包含有意义的非文本元素时，不算空
  if (/<(img|table|hr|video|audio|iframe|canvas)\b/i.test(html)) return false
  const stripped = html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/[\u200B\uFEFF]/g, '')
    .trim()
  return stripped === ''
}

// 安全地将内容设置到编辑器（返回是否成功）
const trySetContent = (html: string, emitUpdate = true): boolean => {
  const editor = editorInstance.value
  if (!editor || isUnmounted.value) return false

  try {
    const { state, view, schema } = editor
    const tr = state.tr
    const newContent = createNodeFromContent(html, schema, {
      parseOptions: { preserveWhitespace: 'full' },
      errorOnInvalidContent: false
    })

    tr.replaceWith(0, tr.doc.content.size, newContent as any)

    if (tr.doc.content.size === 0 && schema.nodes.paragraph) {
      tr.insert(0, schema.nodes.paragraph.create())
    }

    try {
      tr.setSelection(Selection.atStart(tr.doc))
    } catch {
      // 选区设置失败可忽略
    }

    tr.setMeta('preventUpdate', !emitUpdate)
    view.dispatch(tr)
    return true
  } catch (e) {
    logger.warn('setContent 失败，尝试不触发同步:', e)
    try {
      const { state, view, schema } = editor
      const tr = state.tr
      const newContent = createNodeFromContent(html, schema, {
        parseOptions: { preserveWhitespace: 'full' },
        errorOnInvalidContent: false
      })
      tr.replaceWith(0, tr.doc.content.size, newContent as any)
      tr.setMeta('preventUpdate', true)
      view.dispatch(tr)
      return true
    } catch (e2) {
      console.error('setContent 彻底失败:', e2)
      return false
    }
  }
}

// 防重入锁：防止多个触发源（handleEditorReady / onSynced / watch）同时调用 applyPreloadedContent
const isApplyingContent = ref(false)

const tryApplyPreloadedContent = () => {
  if (preloadedApplied.value || isApplyingContent.value || !preloadedContent.value) return
  if (!isEditorReady.value) return
  // 严格要求：必须等待协作同步完成后再决定是否应用预加载内容
  if (!isCollaborationSynced.value) return
  void applyPreloadedContent()
}

/**
 * 应用预加载内容到编辑器
 * 重构后：for + await sleep 替代嵌套 setTimeout，3 次重试
 * 保留的边界处理：编辑器 DOM 就绪检测、样式恢复 fallback、协同连接防护
 */
const applyPreloadedContent = async () => {
  if (!editorInstance.value || !preloadedContent.value || preloadedApplied.value) return
  if (isUnmounted.value || isApplyingContent.value) return

  // 协同同步后检查：如果编辑器已有内容（来自其他用户的协作同步），跳过预加载，防止内容重复
  const syncedHtml = editorInstance.value?.getHTML() || ''
  if (!isEditorContentEmpty(syncedHtml)) {
    logger.debug('协同同步已有内容，跳过预加载（防止内容重复）')
    preloadedApplied.value = true
    isFirstLoadWithContent.value = false
    void clearPreloadedCache()
    return
  }

  isApplyingContent.value = true

  try {
    const content = preloadedContent.value.trim()

    // 1. 规范化 + 图片清理
    const normalizedHtml = normalizePreloadedHtml(content)
    const safeHtml = sanitizeImagesIfNeeded(normalizedHtml, 'preload')

    // 2. 检查内容是否有实质（纯文本或图片）
    const strippedText = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
    const hasImages = /<img\b[^>]*src=/i.test(content)
    if (!strippedText && !hasImages) {
      logger.debug('预加载内容为空，跳过')
      return
    }

    // 3. 直接使用 data:image（跳过 blob URL 转换，避免竞态错误）
    const contentToApply = safeHtml

    // 4. 等待编辑器 DOM 稳定后再尝试
    await sleep(300)

    // 5. 重试循环（最多 3 次）
    let applied = false
    const maxRetries = 3

    for (let i = 0; i < maxRetries && !applied; i++) {
      if (isUnmounted.value || preloadedApplied.value) return
      if (i > 0) await sleep(300 * i)

      const currentHtml = editorInstance.value?.getHTML() || ''
      const preloadedHasStyle = hasStyleHintsInHtml(safeHtml)

      // 判断是否需要应用：编辑器空、首次加载、或预加载有样式但编辑器没有
      const needsApply =
        isEditorContentEmpty(currentHtml) ||
        (isFirstLoadWithContent.value && isEditorContentEmpty(currentHtml)) ||
        (preloadedHasStyle && !hasStyleHintsInHtml(currentHtml))

      if (!needsApply && !isEditorContentEmpty(currentHtml)) {
        // 编辑器已有实质内容（可能来自协同同步），跳过预加载
        logger.debug('编辑器已有实质内容，跳过预加载')
        applied = true
        break
      }

      // 尝试设置内容
      const setOk = trySetContent(contentToApply)
      if (!setOk) continue

      // 等待渲染后验证
      await sleep(200)
      if (isUnmounted.value || !editorInstance.value) return

      const appliedHtml = editorInstance.value.getHTML()

      if (isEditorContentEmpty(appliedHtml)) {
        // 内容没有生效，重试
        logger.info(`第 ${i + 1} 次应用未生效，重试...`)
        continue
      }

      // 检查样式保真度：如果预加载有样式但应用后丢失，尝试恢复
      if (preloadedHasStyle && !hasStyleHintsInHtml(appliedHtml)) {
        logger.warn('样式丢失，尝试恢复...')
        trySetContent(normalizedHtml, true)
      }

      applied = true
    }

    // 6. 如果所有重试失败，尝试纯文本 fallback
    if (!applied && strippedText) {
      logger.warn('富文本应用失败，降级为纯文本')
      const fallbackHtml = strippedText
        .split(/\n+/)
        .filter((line) => line.trim())
        .map((line) => `<p>${escapeHtml(line.trim())}</p>`)
        .join('')
      if (fallbackHtml) {
        trySetContent(fallbackHtml, true)
      }
    }

    // 7. 标记完成，清理缓存
    preloadedApplied.value = true
    isFirstLoadWithContent.value = false
    void clearPreloadedCache()

    if (applied) {
      ElMessage.success('文档内容已加载')
    }
  } catch (error) {
    console.error('设置预加载内容失败:', error)
    ElMessage.warning('文档内容加载失败，请手动输入')
  } finally {
    isApplyingContent.value = false
  }
}

// 编辑器就绪回调
const handleEditorReady = async (editor: any) => {
  editorInstance.value = editor
  logger.debug('Tiptap 编辑器已就绪')
  isEditorReady.value = true
  tryApplyPreloadedContent()
}

// 保存文档 - 使用真实 DOCX 格式
const handleSave = async () => {
  if (isNil(editorInstance.value)) {
    ElMessage.warning('编辑器未就绪')
    return
  }

  isSaving.value = true
  try {
    // 获取编辑器的 HTML 内容
    const content = editorInstance.value.getHTML()
    const restored = await restoreBlobImagesFromOriginAsync(content)
    const normalizedHtml = normalizeHtmlThroughDocModel(restored, {
      source: 'html',
      method: 'tiptap-html'
    })
    const docModel = parseHtmlToDocModel(normalizedHtml, {
      source: 'html',
      method: 'tiptap-html'
    })

    // 使用 DocModel 生成真实的 DOCX 文件
    const blob = await docModelToDocx(docModel, documentTitle.value)
    const filename = `${documentTitle.value}.docx`
    logger.debug(
      '保存文件，文档ID:',
      documentId.value,
      '文件名:',
      filename,
      '文件大小:',
      blob.size,
      'bytes',
      '(真实 DOCX 格式)'
    )

    // 调用保存文档接口
    const result = await saveDocumentFile(documentId.value, blob, filename)

    if (result.code === 200 || result.status === 200) {
      ElMessage.success('文档已保存')
      // 标记文档已保存
      hasUnsavedChanges.value = false

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

// 加载文档数据
const loadDocument = async () => {
  try {
    // 从 sessionStorage 获取文档信息（由 performance 页面传递）
    const cachedDocInfoKey = `doc_info_${documentId.value}`
    const cachedDocInfo = sessionStorage.getItem(cachedDocInfoKey)

    if (cachedDocInfo) {
      documentInfo.value = JSON.parse(cachedDocInfo) as DocumentInfo
      logger.debug('从缓存加载文档信息:', documentInfo.value)
    } else {
      // 如果没有缓存的文档信息，使用默认值
      const now = new Date().toISOString()
      documentInfo.value = {
        id: documentId.value,
        title: (route.query.title as string) || '新文档',
        content: '<p></p>',
        createTime: now,
        updateTime: now,
        version: 'V1.0',
        tags: [],
        creatorId: 0,
        creatorName: '未知'
      }
      logger.debug('使用默认文档信息:', documentInfo.value)
    }

    // 加载参考素材
    referenceMaterials.value = await getReferenceMaterials(documentId.value)
    // referenceMaterials.value = [
    //   {
    //     id: 1,
    //     title: '参考素材1',
    //     date: '2025-01-01',
    //     author: '张三',
    //     content: '参考素材1内容'
    //   },
    //   {
    //     id: 2,
    //     title: '参考素材2',
    //     date: '2025-01-02',
    //     author: '李四',
    //     content: '参考素材2内容'
    //   }
    // ]
  } catch (error) {
    console.error('加载文档失败:', error)
    // 确保即使出错也有默认值
    const now = new Date().toISOString()
    documentInfo.value = {
      id: documentId.value,
      title: (route.query.title as string) || '新文档',
      content: '<p></p>',
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
  (newDocId) => {
    // 重置预加载与就绪状态，避免跨文档污染
    preloadedContent.value = ''
    preloadedApplied.value = false
    preloadedCacheCleared.value = false
    isFirstLoadWithContent.value = false
    isEditorReady.value = false
    isCollaborationSynced.value = false

    pendingTimers.value.forEach((timerId) => {
      clearTimeout(timerId)
    })
    pendingTimers.value.clear()

    // 使用 hook 的 reinitialize 方法重新初始化协同编辑
    loadDocument()
    reinitializeCollaboration(newDocId, documentInfo.value?.creatorId)
  }
)

watch(
  () => isCollaborationReady.value,
  (ready) => {
    if (ready && !isCollaborationSynced.value) {
      isCollaborationSynced.value = true
      tryApplyPreloadedContent()
    }
  }
)

// 组件挂载
onMounted(async () => {
  // 从 Pinia 内存 Store 获取文件 ArrayBuffer，如果为空（页面刷新）则从后端重新获取
  const docBufferStore = useDocBufferStore()
  let arrayBuffer: ArrayBuffer | null = docBufferStore.getBuffer(documentId.value)
  preloadedCacheCleared.value = false

  if (!arrayBuffer) {
    logger.debug('内存中无缓存，从后端获取文件流, id:', documentId.value)
    try {
      const blob = await getFileStreamApi(documentId.value)
      if (blob && blob.size > 0) {
        arrayBuffer = await blob.arrayBuffer()
        logger.debug('从后端获取文件流成功, size:', arrayBuffer.byteLength)
      }
    } catch (error) {
      logger.warn('从后端获取文件流失败，将依赖协同同步:', error)
    }
  } else {
    logger.debug('从内存 Store 获取文件流成功, size:', arrayBuffer.byteLength)
  }

  // 解析文件内容（仅解析暂存，不立即应用到编辑器，等协同同步完成后再决策）
  if (arrayBuffer) {
    try {
      logger.debug('开始解析文件内容, 大小:', arrayBuffer.byteLength)
      const parsedContent = await parseFileContent(arrayBuffer)
      if (parsedContent) {
        // IndexedDB 缓存策略：解析结果有样式时缓存，无样式时尝试用缓存版本恢复
        if (hasStyleHintsInHtml(parsedContent)) {
          // 解析成功且带样式 -> 缓存到 IndexedDB
          preloadedContent.value = parsedContent
          void setDocCache(documentId.value, parsedContent)
          logger.debug('预加载内容解析成功（含样式），已缓存到 IndexedDB，HTML 长度:', parsedContent.length)
        } else {
          // 解析结果无样式 -> 尝试从 IndexedDB 恢复带样式的缓存版本
          const cachedHtml = await getDocCache(documentId.value)
          if (cachedHtml && hasStyleHintsInHtml(cachedHtml)) {
            preloadedContent.value = cachedHtml
            logger.info('解析结果无样式，使用 IndexedDB 缓存的带样式版本，长度:', cachedHtml.length)
          } else {
            // 没有缓存或缓存也无样式，使用当前解析结果
            preloadedContent.value = parsedContent
            logger.debug('预加载内容解析成功（无样式，无可用缓存），HTML 长度:', parsedContent.length)
          }
        }
        isFirstLoadWithContent.value = true
      } else {
        logger.warn('解析结果为空')
      }
    } catch (error) {
      console.error('解析预加载内容失败:', error)
    }
  }

  // 组件挂载时清理过期的 IndexedDB 缓存
  void cleanExpiredDocCache()

  loadDocument()
  // 始终立即连接协作（不再延迟），由 onSynced 回调触发 tryApplyPreloadedContent
  initCollaboration({ autoConnect: true })

  // 第二级安全超时（8s）：覆盖 WebSocket 彻底连不上的场景
  // 确保用户至少能看到预加载的文档内容，不会面对空白编辑器
  const safetyTimeoutId = setTimeout(() => {
    pendingTimers.value.delete(safetyTimeoutId)
    if (isUnmounted.value) return
    if (!isCollaborationSynced.value) {
      logger.warn('协作连接超时(8s)，强制应用预加载内容')
      isCollaborationSynced.value = true
      tryApplyPreloadedContent()
    }
  }, 8000)
  pendingTimers.value.add(safetyTimeoutId)
})

// 组件卸载 - 清理非协同相关的资源
// 注意: useCollaboration hook 会自动清理协同编辑相关的资源（ydoc, provider, 事件监听器等）
onBeforeUnmount(() => {
  // 标记组件已卸载，防止异步回调继续执行
  isUnmounted.value = true

  // 清理自动保存定时器
  if (autoSaveTimer.value) {
    clearTimeout(autoSaveTimer.value)
    autoSaveTimer.value = null
  }

  // 清理所有待执行的 setTimeout，防止内存泄漏
  pendingTimers.value.forEach((timerId) => {
    clearTimeout(timerId)
  })
  pendingTimers.value.clear()

  // 清理编辑器实例引用
  editorInstance.value = null
  tiptapEditorRef.value = null

  imageStore.clear()

  // 清理其他响应式引用
  referenceMaterials.value = []
  documentInfo.value = null
  currentMaterial.value = null
  preloadedContent.value = ''
  isFirstLoadWithContent.value = false

  logger.debug('协同编辑组件已清理')
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
