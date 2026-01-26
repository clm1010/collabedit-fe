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
          <!-- 协同编辑器：等待 ydoc、fragment 和 provider 都就绪后再渲染，避免 Yjs sync-plugin 初始化错误 -->
          <TiptapEditor
            v-if="isCollaborationReady && provider && ydoc && fragment"
            ref="tiptapEditorRef"
            :ydoc="ydoc!"
            :fragment="fragment!"
            :provider="provider!"
            :user="currentUser"
            :title="documentTitle"
            :placeholder="'开始编写 ' + documentTitle + '...'"
            :loading="false"
            :editable="!isReadonly"
            @update="handleContentUpdate"
            @ready="handleEditorReady"
          />
          <!-- 协同未就绪时显示加载状态 -->
          <div v-else class="p-6 h-full">
            <el-skeleton :rows="12" animated />
          </div>
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
import { parseFileContent } from './utils/wordParser'
import { getDocContent, removeDocContent } from '@/views/utils/docStorage'
import { htmlToDocx } from '@/views/utils/htmlToDocx'

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

// 内容更新回调
const handleContentUpdate = (_content: string) => {
  // 可以在这里做自动保存等操作
  // console.log('文档内容更新')
}

const clearPreloadedCache = async () => {
  if (preloadedCacheCleared.value) return
  preloadedCacheCleared.value = true
  try {
    await removeDocContent(documentId.value)
  } catch (error) {
    console.warn('清理预加载缓存失败:', error)
  }
}

const escapeHtml = (text: string) => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const tryApplyPreloadedContent = () => {
  if (preloadedApplied.value || !preloadedContent.value) return
  if (!isEditorReady.value) return
  if (!isCollaborationSynced.value) return
  applyPreloadedContent()
}

const applyPreloadedContent = () => {
  if (!editorInstance.value || !preloadedContent.value || preloadedApplied.value) {
    console.log('applyPreloadedContent 跳过:', {
      hasEditor: !!editorInstance.value,
      hasPreloadedContent: !!preloadedContent.value,
      preloadedApplied: preloadedApplied.value
    })
    return
  }
  try {
    console.log('设置预加载内容到编辑器')
    const content = preloadedContent.value.trim()
    const strippedContent = content
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim()
    if (content && strippedContent.length > 0) {
      // 在协同编辑模式下，需要使用 emitUpdate: true 来触发 Yjs 同步
      // 使用多次重试机制，确保在协同同步后正确应用预加载内容
      const tryApplyContent = (retryCount = 0, maxRetries = 5, delay = 300) => {
        // 检查组件是否已卸载，避免内存泄漏
        if (isUnmounted.value) return
        if (!editorInstance.value || preloadedApplied.value) return
        
        // 检查当前编辑器是否为空（只有一个空段落或仅包含空白字符）
        const currentContent = editorInstance.value.getHTML()
        const currentStripped = currentContent
          ?.replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/\u200B/g, '') // 零宽空格
          .replace(/\uFEFF/g, '') // BOM
          .trim() || ''
        
        const isEditorEmpty = !currentContent || 
          currentContent === '<p></p>' || 
          currentContent === '<p><br></p>' ||
          currentContent === '<p><br class="ProseMirror-trailingBreak"></p>' ||
          currentStripped === ''
        
        console.log(`applyPreloadedContent 尝试 ${retryCount + 1}/${maxRetries}:`, {
          currentContent: currentContent?.substring(0, 100),
          currentStripped: currentStripped?.substring(0, 50),
          isEditorEmpty,
          isFirstLoadWithContent: isFirstLoadWithContent.value
        })
        
        // 首次加载且有预加载内容时，强制应用（即使协同同步了空内容）
        // 或者编辑器为空时应用
        if (isEditorEmpty || (isFirstLoadWithContent.value && currentStripped.length < 10)) {
          console.log('应用预加载内容到编辑器')
          // 使用 emitUpdate: true 确保触发协同同步
          editorInstance.value.commands.setContent(content, true)
          
          try {
            const { doc } = editorInstance.value.state
            if (doc.content.size > 0) {
              const firstPos = doc.resolve(1)
              if (firstPos.parent.isTextblock) {
                editorInstance.value.commands.setTextSelection(1)
              } else {
                editorInstance.value.commands.focus('start')
              }
            }
          } catch (selectionError) {
            console.warn('设置光标位置失败，使用默认位置:', selectionError)
          }

          const verifyTimerId = setTimeout(() => {
            pendingTimers.value.delete(verifyTimerId)
            if (isUnmounted.value || !editorInstance.value) return

            const appliedContent = editorInstance.value.getHTML()
            const appliedStripped = appliedContent
              ?.replace(/<[^>]*>/g, '')
              .replace(/&nbsp;/g, ' ')
              .replace(/\u200B/g, '')
              .replace(/\uFEFF/g, '')
              .trim() || ''

            if (appliedStripped) {
              preloadedApplied.value = true
              isFirstLoadWithContent.value = false
              void clearPreloadedCache()
              ElMessage.success('文档内容已加载')
            } else if (retryCount < maxRetries - 1) {
              console.warn('预加载内容未生效，准备重试...')
              if (strippedContent) {
                const fallbackHtml = strippedContent
                  .split(/\n+/)
                  .filter((line) => line.trim())
                  .map((line) => `<p>${escapeHtml(line.trim())}</p>`)
                  .join('')
                if (fallbackHtml) {
                  editorInstance.value.commands.setContent(fallbackHtml, true)
                }
              }
              tryApplyContent(retryCount + 1, maxRetries, delay)
            } else {
              console.warn('预加载内容应用失败，已达到最大重试次数')
            }
          }, 200)
          pendingTimers.value.add(verifyTimerId)
        } else if (retryCount < maxRetries - 1) {
          // 如果编辑器有内容但可能是协同同步的旧内容，再等待一会儿重试
          console.log(`编辑器有内容，${delay}ms 后重试...`)
          const timerId = setTimeout(() => {
            pendingTimers.value.delete(timerId)
            tryApplyContent(retryCount + 1, maxRetries, delay)
          }, delay)
          pendingTimers.value.add(timerId)
        } else {
          console.log('编辑器已有实质内容，跳过预加载')
          preloadedApplied.value = true
          isFirstLoadWithContent.value = false
          void clearPreloadedCache()
        }
      }
      
      // 初始延迟后开始尝试
      const initialTimerId = setTimeout(() => {
        pendingTimers.value.delete(initialTimerId)
        tryApplyContent()
      }, 500)
      pendingTimers.value.add(initialTimerId)
    } else {
      console.log('预加载内容为空，跳过设置')
    }
  } catch (error) {
    console.error('设置预加载内容失败:', error)
    ElMessage.warning('文档内容加载失败，请手动输入')
  }
}

// 编辑器就绪回调
const handleEditorReady = async (editor: any) => {
  editorInstance.value = editor
  console.log('Tiptap 编辑器已就绪')
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

    // 使用 htmlToDocx 生成真实的 DOCX 文件
    const blob = await htmlToDocx(content, documentTitle.value)
    const filename = `${documentTitle.value}.docx`
    console.log(
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
      console.log('从缓存加载文档信息:', documentInfo.value)
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
      console.log('使用默认文档信息:', documentInfo.value)
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
  // 检查是否有预加载的文件内容（从 IndexedDB 中获取，避免 sessionStorage 配额限制）
  const cachedContentKey = `doc_content_${documentId.value}`
  const cachedContent = await getDocContent(documentId.value)
  preloadedCacheCleared.value = false
  console.log(
    '文档ID:',
    documentId.value,
    '缓存键:',
    cachedContentKey,
    '是否有缓存:',
    !!cachedContent
  )

  // 只要有缓存内容就尝试解析，不再依赖 hasContent 参数
  if (cachedContent) {
    try {
      console.log('发现预加载的文件内容，正在解析...', '内容长度:', cachedContent.length)

      // 解析 base64 文件流为文档内容
      const parsedContent = await parseFileContent(cachedContent)

      if (parsedContent) {
        preloadedContent.value = parsedContent
        isFirstLoadWithContent.value = true // 标记为首次加载有内容
        console.log('预加载内容解析成功，HTML 长度:', parsedContent.length)
        tryApplyPreloadedContent()
      } else {
        console.warn('解析结果为空')
      }
    } catch (error) {
      console.error('解析预加载内容失败:', error)
    }
  }

  loadDocument()
  initCollaboration()
})

// 组件卸载 - 清理非协同相关的资源
// 注意: useCollaboration hook 会自动清理协同编辑相关的资源（ydoc, provider, 事件监听器等）
onBeforeUnmount(() => {
  // 标记组件已卸载，防止异步回调继续执行
  isUnmounted.value = true

  // 清理所有待执行的 setTimeout，防止内存泄漏
  pendingTimers.value.forEach((timerId) => {
    clearTimeout(timerId)
  })
  pendingTimers.value.clear()

  // 清理编辑器实例引用
  editorInstance.value = null
  tiptapEditorRef.value = null

  // 清理其他响应式引用
  referenceMaterials.value = []
  documentInfo.value = null
  currentMaterial.value = null
  preloadedContent.value = ''
  isFirstLoadWithContent.value = false

  console.log('协同编辑组件已清理')
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
