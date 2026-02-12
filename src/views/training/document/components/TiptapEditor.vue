<template>
  <div class="tiptap-editor-wrapper">
    <!-- 工具栏：editor 就绪即显示，不等待内容加载 -->
    <EditorToolbar
      v-if="editor && editable"
      :editor="editor"
      :save-status="saveStatus"
    />

    <!-- 编辑器内容区域 -->
    <div class="tiptap-content-wrapper" ref="contentWrapperRef" @scroll="handleScroll">
      <!-- 内容加载骨架覆盖层（绝对定位，不影响编辑器初始化和内容接收） -->
      <Transition name="skeleton-fade">
        <div v-if="contentLoading || !editor" class="content-skeleton-overlay">
          <div class="a4-skeleton-box">
            <el-skeleton :rows="12" animated />
          </div>
        </div>
      </Transition>
      <!-- 编辑器内容（始终渲染，在覆盖层下方接收协同内容） -->
      <template v-if="editor">
        <!-- A4 页面容器 -->
        <div class="page-container">
          <div
            class="page-content"
            :style="{
              width: pageWidth + 'px',
              minHeight: pageHeight + 'px',
              padding: `${pageMargin.top}px ${pageMargin.right}px ${pageMargin.bottom}px ${pageMargin.left}px`,
              background: pageBackground
            }"
          >
            <!-- 官方 DragHandle 组件 - 只读模式下隐藏 -->
            <DragHandle
              v-if="editor && editable"
              :editor="editor"
              :compute-position-config="{ placement: 'left-start', strategy: 'absolute' }"
              @node-change="handleDragNodeChange"
            >
              <div class="drag-handle-container">
                <button class="drag-handle-plus" @click="addParagraphAfter" title="添加新段落">
                  <Icon icon="mdi:plus" />
                </button>
                <div class="drag-handle-grip" title="拖动移动段落">
                  <Icon icon="mdi:drag" />
                </div>
              </div>
            </DragHandle>
            <editor-content :editor="editor" class="tiptap-content" />

            <!-- 气泡菜单 - 参考 https://tiptap.dev/docs/editor/extensions/functionality/bubble-menu -->
            <!-- 只读模式下隐藏气泡菜单 -->
            <div ref="bubbleMenuRef" class="bubble-menu" v-show="editor && editable">
              <div class="bubble-menu-container">
                <button
                  class="bubble-menu-btn"
                  :class="{ 'is-active': editor?.isActive('bold') }"
                  @click="editor?.chain().focus().toggleBold().run()"
                  title="加粗"
                >
                  <Icon icon="mdi:format-bold" />
                </button>
                <button
                  class="bubble-menu-btn"
                  :class="{ 'is-active': editor?.isActive('italic') }"
                  @click="editor?.chain().focus().toggleItalic().run()"
                  title="斜体"
                >
                  <Icon icon="mdi:format-italic" />
                </button>
                <button
                  class="bubble-menu-btn"
                  :class="{ 'is-active': editor?.isActive('underline') }"
                  @click="editor?.chain().focus().toggleUnderline().run()"
                  title="下划线"
                >
                  <Icon icon="mdi:format-underline" />
                </button>
                <button
                  class="bubble-menu-btn"
                  :class="{ 'is-active': editor?.isActive('strike') }"
                  @click="editor?.chain().focus().toggleStrike().run()"
                  title="删除线"
                >
                  <Icon icon="mdi:format-strikethrough" />
                </button>
                <div class="bubble-menu-divider"></div>
                <ColorPicker
                  v-model="bubbleTextColor"
                  icon="mdi:format-color-text"
                  title="字体颜色"
                  @change="handleBubbleTextColor"
                />
                <ColorPicker
                  v-model="bubbleHighlightColor"
                  icon="mdi:format-color-highlight"
                  title="字体背景颜色"
                  @change="handleBubbleHighlightColor"
                />
                <button
                  ref="linkBtnRef"
                  class="bubble-menu-btn"
                  :class="{ 'is-active': editor?.isActive('link') }"
                  @click="toggleBubbleLink"
                  title="链接"
                >
                  <Icon icon="mdi:link" />
                </button>
                <div class="bubble-menu-divider"></div>
                <button
                  class="bubble-menu-btn"
                  :class="{ 'is-active': editor?.isActive({ textAlign: 'left' }) }"
                  @click="editor?.chain().focus().setTextAlign('left').run()"
                  title="左对齐"
                >
                  <Icon icon="mdi:format-align-left" />
                </button>
                <button
                  class="bubble-menu-btn"
                  :class="{ 'is-active': editor?.isActive({ textAlign: 'center' }) }"
                  @click="editor?.chain().focus().setTextAlign('center').run()"
                  title="居中"
                >
                  <Icon icon="mdi:format-align-center" />
                </button>
                <button
                  class="bubble-menu-btn"
                  :class="{ 'is-active': editor?.isActive({ textAlign: 'right' }) }"
                  @click="editor?.chain().focus().setTextAlign('right').run()"
                  title="右对齐"
                >
                  <Icon icon="mdi:format-align-right" />
                </button>
              </div>
            </div>

            <!-- Link Popover 组件 -->
            <LinkPopover
              v-if="editor && editable"
              :editor="editor"
              v-model:visible="linkPopoverVisible"
              :initial-url="linkPopoverUrl"
              :trigger-rect="linkPopoverTriggerRect"
              @apply="handleLinkApply"
              @remove="handleLinkRemove"
            />
          </div>
        </div>
      </template>
    </div>

    <!-- 回到顶部按钮 -->
    <transition name="fade">
      <button
        v-show="showBackToTop && !contentLoading"
        class="back-to-top-btn"
        @click="scrollToTop"
        title="回到顶部"
      >
        <Icon icon="mdi:arrow-up" />
      </button>
    </transition>

    <!-- HTML 预览对话框 -->
    <el-dialog
      v-model="htmlPreviewVisible"
      title="HTML 预览"
      width="80%"
      top="5vh"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <div class="preview-tabs">
        <el-radio-group v-model="previewMode" size="small">
          <el-radio-button value="preview">预览</el-radio-button>
          <el-radio-button value="source">源代码</el-radio-button>
        </el-radio-group>
      </div>
      <div class="preview-container">
        <!-- 预览模式 -->
        <div v-if="previewMode === 'preview'" class="html-preview" v-html="previewContent"></div>
        <!-- 源代码模式 -->
        <div v-else class="html-source">
          <pre><code>{{ formattedHtml }}</code></pre>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="copyHtml" type="primary" plain>
            <Icon icon="mdi:content-copy" class="mr-1" /> 复制 HTML
          </el-button>
          <el-button @click="downloadHtml" type="success" plain>
            <Icon icon="mdi:download" class="mr-1" /> 下载 HTML
          </el-button>
          <el-button @click="htmlPreviewVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- PDF 导出对话框 -->
    <el-dialog
      v-model="pdfExportVisible"
      title="导出 PDF"
      width="80%"
      top="5vh"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <div class="pdf-preview-container" ref="pdfPreviewRef">
        <div class="pdf-preview" v-html="previewContent"></div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="exportToPdf" type="primary" :loading="exportingPdf">
            <Icon icon="mdi:file-pdf-box" class="mr-1" /> 导出 PDF
          </el-button>
          <el-button @click="pdfExportVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck - 忽略 Tiptap 版本不兼容导致的类型问题
import { ref, onBeforeUnmount, watch, computed, provide, reactive, onMounted, toRefs } from 'vue'
import { isNil, isEmpty } from 'lodash-es'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import { StarterKit } from '@tiptap/starter-kit'
import { Collaboration } from '@tiptap/extension-collaboration'
import { CollaborationCaret } from '@tiptap/extension-collaboration-caret'
import { Placeholder } from '@tiptap/extensions'
import { TextAlign } from '@tiptap/extension-text-align'
import { Highlight } from '@tiptap/extension-highlight'
import { Link } from '@tiptap/extension-link'
import { Table, TableRow } from '@tiptap/extension-table'
import { CustomTableCell } from './toolbar/extensions/CustomTableCell'
import { CustomTableHeader } from './toolbar/extensions/CustomTableHeader'
import { ResizableImage } from './toolbar/extensions/ResizableImage'
import { TaskList, TaskItem } from '@tiptap/extension-list'
import { TextStyle, FontSize } from '@tiptap/extension-text-style'
import { FontFamily } from '@tiptap/extension-font-family'
import { Color } from '@tiptap/extension-color'
import { BubbleMenuPlugin } from '@tiptap/extension-bubble-menu'
import { Subscript } from '@tiptap/extension-subscript'
import { Superscript } from '@tiptap/extension-superscript'
import { DragHandle } from '@tiptap/extension-drag-handle-vue-3'
import { PageBreak } from './toolbar/extensions/PageBreak'
import { ColoredHorizontalRule } from './toolbar/extensions/ColoredHorizontalRule'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { Icon } from '@/components/Icon'
import { ElMessage } from 'element-plus'
import { EditorToolbar } from './toolbar'
import { EditorKey } from './toolbar/types'
import ColorPicker from './toolbar/ColorPicker.vue'
import LinkPopover from './toolbar/LinkPopover.vue'
import { normalizeColor } from '../utils/wordParser.shared'
import { generateExportHtml } from '@/views/utils/documentExport'

// Props
interface Props {
  ydoc: Y.Doc
  fragment: Y.XmlFragment
  provider: WebsocketProvider
  user: {
    name: string
    color: string
    avatar?: string
  }
  placeholder?: string
  title?: string
  loading?: boolean
  contentLoading?: boolean // 内容是否仍在加载中（由父组件控制）
  editable?: boolean // 是否可编辑（只读模式为 false）
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '开始编写文档内容...',
  title: '文档',
  loading: false,
  contentLoading: false,
  editable: true
})

// 解构 props 以便在模板中使用
const { editable } = toRefs(props)

// Emits
const emit = defineEmits<{
  (e: 'update', content: string): void
  (e: 'ready', editor: any): void
}>()

// 标记组件是否已销毁，防止异步回调导致内存泄漏
let isComponentDestroyed = false

// 保存状态
const saveStatus = ref<'saved' | 'saving' | 'unsaved'>('saved')

// 内容区域引用
const contentWrapperRef = ref<HTMLElement | null>(null)

// 泡泡菜单引用
const bubbleMenuRef = ref<HTMLElement | null>(null)

// BubbleMenu 插件引用（用于卸载时清理）
let bubbleMenuPluginKey: string | null = null

// 气泡菜单颜色选择
const bubbleTextColor = ref('#000000')
const bubbleHighlightColor = ref('#FFFF00')

// LinkPopover 相关状态
const linkPopoverVisible = ref(false)
const linkPopoverUrl = ref('')
const linkPopoverTriggerRect = ref<DOMRect | null>(null)
const linkBtnRef = ref<HTMLElement | null>(null)

// 回到顶部按钮显示状态
const showBackToTop = ref(false)

// 页面设置 - A4 默认尺寸 (96 DPI: 210mm = 794px, 297mm = 1123px)
const pageWidth = ref(794)
const pageHeight = ref(1123)
const pageMargin = reactive({
  top: 96, // 约 25.4mm
  bottom: 96,
  left: 120, // 约 31.8mm
  right: 120
})
const pageBackground = ref('#ffffff')

// 处理滚动事件
const handleScroll = () => {
  if (contentWrapperRef.value) {
    showBackToTop.value = contentWrapperRef.value.scrollTop > 300
  }
}

// 回到顶部
const scrollToTop = () => {
  if (contentWrapperRef.value) {
    contentWrapperRef.value.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }
}

// 更新页面设置
const updatePageSettings = (settings: any) => {
  if (settings.size) {
    // 根据页面大小更新尺寸
    const sizeMap: Record<string, { width: number; height: number }> = {
      A4: { width: 794, height: 1123 },
      A3: { width: 1123, height: 1587 },
      A5: { width: 559, height: 794 },
      B5: { width: 665, height: 945 },
      '5号信封': { width: 412, height: 488 },
      '6号信封': { width: 450, height: 866 }
    }
    const size = sizeMap[settings.size] || sizeMap['A4']

    if (settings.orientation === 'landscape') {
      pageWidth.value = size.height
      pageHeight.value = size.width
    } else {
      pageWidth.value = size.width
      pageHeight.value = size.height
    }
  }

  if (settings.margin) {
    // mm 转 px (96 DPI)
    const mmToPx = (mm: number) => Math.round((mm * 96) / 25.4)
    pageMargin.top = mmToPx(settings.margin.top)
    pageMargin.bottom = mmToPx(settings.margin.bottom)
    pageMargin.left = mmToPx(settings.margin.left)
    pageMargin.right = mmToPx(settings.margin.right)
  }

  if (settings.background) {
    pageBackground.value = settings.background
  }
}

// 预览相关状态
const htmlPreviewVisible = ref(false)
const pdfExportVisible = ref(false)
const previewMode = ref<'preview' | 'source'>('preview')
const previewContent = ref('')
const exportingPdf = ref(false)
const pdfPreviewRef = ref<HTMLElement | null>(null)

// 格式化 HTML 用于显示
const formattedHtml = computed(() => {
  if (isEmpty(previewContent.value)) return ''
  // 简单格式化 HTML
  return previewContent.value
    .replace(/></g, '>\n<')
    .replace(/(<\/?[^>]+>)/g, '\n$1')
    .split('\n')
    .filter((line) => line.trim())
    .join('\n')
})

// 编辑器实例
const editor = useEditor({
  // 延迟渲染，等待 DOM 和 Y.Doc 完全就绪，避免 y-prosemirror 初始化时的 "Unexpected case" 错误
  immediatelyRender: false,
  editable: props.editable, // 根据 props 控制是否可编辑
  extensions: [
    StarterKit.configure({
      // Tiptap v3: history 重命名为 undoRedo
      undoRedo: false, // 禁用 undoRedo，Collaboration 会处理
      // 禁用 StarterKit 自带的 Link，使用自定义配置
      link: false,
      // 禁用默认的 horizontalRule，使用自定义的 ColoredHorizontalRule
      horizontalRule: false
    }),
    // 自定义水平线扩展（支持红色横线）
    ColoredHorizontalRule,
    // 协同编辑 - 使用预初始化的 fragment 而不是 document
    // 这可以避免 y-prosemirror 在空 Y.Doc 上初始化时的 "Unexpected case" 错误
    Collaboration.configure({
      fragment: props.fragment
    }),
    // Tiptap v3: 协同光标扩展重命名为 CollaborationCaret
    CollaborationCaret.configure({
      provider: props.provider,
      user: {
        id: props.user.id,
        name: props.user.name,
        color: props.user.color
      }
    }),
    // 占位符
    Placeholder.configure({
      placeholder: props.placeholder
    }),
    // 文本对齐
    TextAlign.configure({
      types: ['heading', 'paragraph']
    }),
    // Tiptap v3: Underline 已包含在 StarterKit 中，无需单独添加
    // 高亮
    Highlight.configure({
      multicolor: true
    }),
    // Tiptap v3: Link 已包含在 StarterKit 中，此处覆盖配置
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-blue-500 underline cursor-pointer'
      }
    }),
    // 可调整大小的图片
    ResizableImage.configure({
      inline: false,
      allowBase64: true,
      HTMLAttributes: {
        class: 'editor-image'
      }
    }),
    // 表格 - 使用自定义扩展支持对齐和背景色
    Table.configure({
      resizable: true
    }),
    TableRow,
    CustomTableCell,
    CustomTableHeader,
    // 任务列表
    TaskList,
    TaskItem.configure({
      nested: true
    }),
    // 文本样式
    TextStyle,
    // 字号
    FontSize.configure({
      types: ['textStyle']
    }),
    // 字体
    FontFamily.configure({
      types: ['textStyle']
    }),
    // 文字颜色
    Color.configure({
      types: ['textStyle']
    }),
    // 上标
    Superscript,
    // 下标
    Subscript,
    // 分页符
    PageBreak.configure({
      HTMLAttributes: {
        class: 'page-break'
      }
    })
  ],
  onUpdate: ({ editor }) => {
    // 防止组件销毁后触发回调
    if (isComponentDestroyed) return
    saveStatus.value = 'unsaved'
    emit('update', editor.getHTML())
  },
  onCreate: ({ editor }) => {
    // 防止组件销毁后触发回调
    if (isComponentDestroyed) return
    emit('ready', editor)
  }
})

// 提供编辑器实例给工具栏组件 - 直接提供 editor ref
provide(EditorKey, editor)

// ==================== DragHandle 相关 ====================
// 当前悬停的节点信息
const currentDragNode = ref<{ node: any; editor: any; pos: number } | null>(null)

// 处理节点变化
const handleDragNodeChange = (data: { node: any; editor: any; pos: number } | null) => {
  currentDragNode.value = data
}

// 在当前节点后添加新段落
const addParagraphAfter = () => {
  if (isNil(editor.value) || isNil(currentDragNode.value)) return

  const { pos, node } = currentDragNode.value
  if (!node || typeof node.nodeSize !== 'number') {
    if (import.meta.env.DEV) {
      console.warn('[编辑器] DragHandle 节点无效，跳过插入')
    }
    return
  }
  const endPos = pos + node.nodeSize

  editor.value.chain().focus().insertContentAt(endPos, { type: 'paragraph' }).run()
}

// ==================== BubbleMenu 相关 ====================
// 在 onMounted 中注册 BubbleMenu 插件
onMounted(() => {
  // 等待 DOM 就绪后注册 BubbleMenu（只读模式也需要注册，shouldShow 会控制显示）
  if (!isNil(editor.value) && !isNil(bubbleMenuRef.value)) {
    registerBubbleMenu()
  }
})

// 处理编辑器点击事件（用于点击链接时打开 LinkPopover）
const handleEditorClick = (event: MouseEvent) => {
  if (!props.editable) return

  const target = event.target as HTMLElement

  // 检查是否点击了链接
  const linkElement = target.closest('a')
  if (linkElement && editor.value) {
    event.preventDefault()

    // 获取链接的 URL
    const href = linkElement.getAttribute('href') || ''

    // 设置 LinkPopover
    linkPopoverUrl.value = href
    linkPopoverTriggerRect.value = linkElement.getBoundingClientRect()

    // 在编辑器中选中这个链接
    const pos = editor.value.view.posAtDOM(linkElement, 0)
    let linkPos = -1
    editor.value.state.doc.nodesBetween(
      pos,
      pos + linkElement.textContent!.length,
      (node, nodePos) => {
        if (node.marks.some((m: any) => m.type.name === 'link')) {
          linkPos = nodePos
          return false
        }
        return true
      }
    )

    if (linkPos >= 0) {
      // 选中链接
      editor.value
        .chain()
        .focus()
        .setTextSelection({ from: linkPos, to: linkPos + (linkElement.textContent?.length || 0) })
        .run()
    }

    // 显示 LinkPopover
    linkPopoverVisible.value = true
  }
}

// 安全添加链接点击事件监听
const addLinkClickListener = (editorInstance?: any) => {
  try {
    if (!editorInstance || editorInstance.isDestroyed || !props.editable) return
    const dom = editorInstance.view?.dom
    if (dom) {
      dom.addEventListener('click', handleEditorClick)
    }
  } catch (e) {
    // 视图未就绪时忽略
  }
}

// 安全移除链接点击事件监听
const removeLinkClickListener = (editorInstance?: any) => {
  try {
    if (!editorInstance || editorInstance.isDestroyed) return
    const dom = editorInstance.view?.dom
    if (dom) {
      dom.removeEventListener('click', handleEditorClick)
    }
  } catch (e) {
    // 视图可能已被销毁，忽略
  }
}

// 监听编辑器和菜单元素，在两者都就绪后注册 BubbleMenu
watch(
  [() => editor.value, () => bubbleMenuRef.value],
  ([newEditor, newMenuRef]) => {
    if (!isNil(newEditor) && !isNil(newMenuRef)) {
      registerBubbleMenu()
    }
  },
  { immediate: true }
)

// 监听编辑器初始化，添加链接点击事件监听
watch(
  () => editor.value,
  (newEditor, oldEditor) => {
    removeLinkClickListener(oldEditor)
    addLinkClickListener(newEditor)
  },
  { immediate: true }
)

// 监听编辑器选区变化，同步气泡菜单颜色
watch(
  () => editor.value,
  (newEditor, oldEditor) => {
    if (oldEditor) {
      oldEditor.off('selectionUpdate', updateBubbleColors)
      oldEditor.off('transaction', updateBubbleColors)
    }
    if (newEditor) {
      newEditor.on('selectionUpdate', updateBubbleColors)
      newEditor.on('transaction', updateBubbleColors)
      updateBubbleColors()
    }
  },
  { immediate: true }
)

// 注册 BubbleMenu 插件
const registerBubbleMenu = () => {
  if (isNil(editor.value) || isNil(bubbleMenuRef.value)) return

  // 检查是否已经注册过
  const existingPlugin = editor.value.view.state.plugins.find(
    (plugin: any) => plugin.key === 'bubbleMenu$'
  )
  if (!isNil(existingPlugin)) return

  // 保存插件 key 以便后续移除
  bubbleMenuPluginKey = 'bubbleMenu'

  // 使用 BubbleMenuPlugin 创建插件
  const plugin = BubbleMenuPlugin({
    pluginKey: bubbleMenuPluginKey,
    editor: editor.value,
    element: bubbleMenuRef.value,
    shouldShow: ({ state }) => {
      // 只读模式下不显示泡泡菜单
      if (!props.editable) return false

      const { empty } = state.selection
      if (empty) return false
      // 检查是否在文本块中
      const isTextSelection = state.selection.$from.parent.isTextblock
      return isTextSelection
    },
    options: {
      placement: 'top',
      offset: { mainAxis: 8, crossAxis: 0 }
    }
  })

  // 注册插件到编辑器
  editor.value.registerPlugin(plugin)
}

// 气泡菜单中切换链接 - 使用 LinkPopover 组件
const toggleBubbleLink = () => {
  if (isNil(editor.value)) return

  // 获取当前链接的 URL
  const previousUrl = editor.value.getAttributes('link').href || ''

  // 设置 LinkPopover 的初始 URL
  linkPopoverUrl.value = previousUrl

  // 获取链接按钮的位置作为触发点
  if (linkBtnRef.value) {
    linkPopoverTriggerRect.value = linkBtnRef.value.getBoundingClientRect()
  }

  // 显示 LinkPopover
  linkPopoverVisible.value = true
}

// 应用链接
const handleLinkApply = (url: string) => {
  if (isNil(editor.value) || isEmpty(url)) return

  editor.value.chain().focus().setLink({ href: url }).run()
}

// 删除链接
const handleLinkRemove = () => {
  if (isNil(editor.value)) return

  editor.value.chain().focus().unsetLink().run()
}

// 气泡菜单中处理字体颜色
const handleBubbleTextColor = (color: string) => {
  if (isNil(editor.value)) return
  if (color) {
    editor.value.chain().focus().setColor(color).run()
  } else {
    editor.value.chain().focus().unsetColor().run()
  }
}

// 气泡菜单中处理字体背景颜色
const handleBubbleHighlightColor = (color: string) => {
  if (isNil(editor.value)) return
  if (color) {
    editor.value.chain().focus().setHighlight({ color }).run()
  } else {
    editor.value.chain().focus().unsetHighlight().run()
  }
}

const getSelectionComputedStyle = (): { color?: string; backgroundColor?: string } => {
  if (!editor.value || typeof window === 'undefined') return {}
  const { from } = editor.value.state.selection
  const domAtPos = editor.value.view.domAtPos(from)
  let element: Element | null = null

  if (domAtPos.node.nodeType === Node.TEXT_NODE) {
    element = domAtPos.node.parentElement
  } else if (domAtPos.node instanceof Element) {
    element = domAtPos.node
  }

  if (!element) return {}
  const style = window.getComputedStyle(element)
  return {
    color: style.color,
    backgroundColor: style.backgroundColor
  }
}

const updateBubbleColors = () => {
  if (!editor.value) return
  const textColor = editor.value.getAttributes('textStyle').color
  const highlight = editor.value.getAttributes('highlight').color

  let resolvedText = normalizeColor(textColor || '')
  let resolvedHighlight = normalizeColor(highlight || '')

  if (!resolvedText || !resolvedHighlight) {
    const computed = getSelectionComputedStyle()
    if (!resolvedText && computed.color) {
      resolvedText = normalizeColor(computed.color)
    }
    if (!resolvedHighlight && computed.backgroundColor) {
      const bg = normalizeColor(computed.backgroundColor)
      if (bg && bg.toUpperCase() !== '#FFFFFF') {
        resolvedHighlight = bg
      }
    }
  }

  if (resolvedText) {
    bubbleTextColor.value = resolvedText
  }
  if (resolvedHighlight) {
    bubbleHighlightColor.value = resolvedHighlight
  }
}

// ==================== 预览功能 ====================

// 生成完整的 HTML 文档（异步，自动还原 blob 图片）
const generateFullHtml = async (): Promise<string> => {
  if (isNil(editor.value)) return ''
  return generateExportHtml(editor.value.getHTML(), props.title || '文档')
}

// HTML 预览
const previewHtml = () => {
  if (isNil(editor.value)) {
    ElMessage.warning('编辑器未就绪')
    return
  }
  previewContent.value = editor.value.getHTML()
  previewMode.value = 'preview'
  htmlPreviewVisible.value = true
}

// 复制 HTML
const copyHtml = async () => {
  try {
    const html = await generateFullHtml()
    await navigator.clipboard.writeText(html)
    ElMessage.success('HTML 已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

// 下载 HTML
const downloadHtml = async () => {
  const html = await generateFullHtml()
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${props.title || '文档'}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  ElMessage.success('HTML 已下载')
}

// PDF 预览
const previewPdf = () => {
  if (isNil(editor.value)) {
    ElMessage.warning('编辑器未就绪')
    return
  }
  previewContent.value = editor.value.getHTML()
  pdfExportVisible.value = true
}

// 导出 PDF（使用浏览器打印功能）
const exportToPdf = async () => {
  exportingPdf.value = true

  try {
    const html = await generateFullHtml()
    const printWindow = window.open('', '_blank')

    if (!printWindow) {
      ElMessage.error('无法打开打印窗口，请检查浏览器是否阻止弹窗')
      exportingPdf.value = false
      return
    }

    printWindow.document.write(html)
    printWindow.document.close()

    // 等待内容加载完成后打印
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
        // 打印对话框关闭后关闭窗口
        printWindow.onafterprint = () => {
          printWindow.close()
        }
      }, 250)
    }

    // 如果 onload 没有触发（内容已缓存），直接打印
    if (printWindow.document.readyState === 'complete') {
      setTimeout(() => {
        printWindow.print()
      }, 250)
    }

    pdfExportVisible.value = false
    ElMessage.success('请在打印对话框中选择"另存为 PDF"')
  } catch (error) {
    ElMessage.error('导出失败: ' + (error as Error).message)
  } finally {
    exportingPdf.value = false
  }
}

// 监听用户信息变化
watch(
  () => props.user,
  (newUser) => {
    if (isComponentDestroyed) return
    if (!isNil(editor.value) && !isNil(props.provider)) {
      try {
        editor.value.commands.updateUser({
          name: newUser.name,
          color: newUser.color
        })
      } catch (e) {
        // 忽略更新用户时的错误
        console.warn('更新用户信息失败:', e)
      }
    }
  },
  { deep: true }
)

// 组件卸载时销毁编辑器 - 防止内存泄漏
onBeforeUnmount(() => {
  // 标记组件已销毁
  isComponentDestroyed = true

  // 移除链接点击事件监听
  removeLinkClickListener(editor.value)

  // 销毁编辑器实例（这会自动清理 BubbleMenuPlugin）
  if (!isNil(editor.value)) {
    try {
      editor.value.destroy()
    } catch (e) {
      console.warn('销毁编辑器时出错:', e)
    }
  }

  // 清理插件引用
  bubbleMenuPluginKey = null

  // 清理 DOM 引用
  contentWrapperRef.value = null
  bubbleMenuRef.value = null
  linkBtnRef.value = null

  // 清理预览相关的引用和状态
  previewContent.value = ''
  pdfPreviewRef.value = null

  // 清理 LinkPopover 状态
  linkPopoverVisible.value = false
  linkPopoverUrl.value = ''
  linkPopoverTriggerRect.value = null

  // 重置状态
  saveStatus.value = 'saved'
  showBackToTop.value = false
  htmlPreviewVisible.value = false
  pdfExportVisible.value = false
  exportingPdf.value = false

  // 清理 DragHandle 相关状态
  currentDragNode.value = null
})

// 暴露编辑器实例和方法
defineExpose({
  editor,
  getHTML: () => editor.value?.getHTML() || '',
  generateFullHtml,
  previewHtml,
  previewPdf,
  updatePageSettings,
  scrollToTop
})
</script>

<style lang="scss" scoped>
.tiptap-editor-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f4f5f7;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.tiptap-content-wrapper {
  position: relative;
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
  background: #e8eaed;

  // 自定义滚动条样式 - 参考 Umo Editor
  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 4px;
    transition: background 0.2s ease;

    &:hover {
      background: #a8a8a8;
    }
  }

  &::-webkit-scrollbar-corner {
    background: transparent;
  }
}

// 内容骨架覆盖层
.content-skeleton-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  background: #e8eaed;
  overflow: hidden;
}

.a4-skeleton-box {
  max-width: 794px;
  margin: 24px auto;
  padding: 40px 60px;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

// 骨架屏淡出过渡
.skeleton-fade-leave-active {
  transition: opacity 0.3s ease;
}

.skeleton-fade-leave-to {
  opacity: 0;
}

// A4 页面容器
.page-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px 60px;
  min-height: 100%;
  gap: 40px; // 页面之间的间距
}

// 页面内容区域 - 模拟 A4 纸张
.page-content {
  position: relative;
  background: #fff;
  box-shadow:
    0 2px 12px rgba(0, 0, 0, 0.08),
    0 0 1px rgba(0, 0, 0, 0.1);
  border-radius: 2px;
  transition: all 0.3s ease;

  // 页面边角装饰
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 20px;
    height: 20px;
    border-left: 1px solid #e0e0e0;
    border-top: 1px solid #e0e0e0;
    pointer-events: none;
  }

  &::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 20px;
    height: 20px;
    border-right: 1px solid #e0e0e0;
    border-top: 1px solid #e0e0e0;
    pointer-events: none;
  }
}

// 回到顶部按钮
.back-to-top-btn {
  position: absolute;
  right: 24px;
  bottom: 24px;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: #1a73e8;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(26, 115, 232, 0.4);
  transition: all 0.2s ease;
  z-index: 100;

  &:hover {
    background: #1557b0;
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(26, 115, 232, 0.5);
  }

  &:active {
    transform: translateY(0);
  }

  :deep(svg) {
    width: 20px;
    height: 20px;
  }
}

// 渐变动画
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.tiptap-content {
  min-height: 100%;

  :deep(.tiptap) {
    outline: none;
    min-height: 500px;
    // 基础字体设置 - 使用中文友好的字体栈
    font-family:
      'SimSun', '宋体', 'Microsoft YaHei', '微软雅黑', 'PingFang SC', 'Hiragino Sans GB', serif;
    font-size: 14px;

    // 段落间距优化：移除通用间距规则，改为针对特定元素设置
    // 原来的 > * + * { margin-top: 0.75em; } 会导致 Word 导入后段落间距过大

    p {
      line-height: 1.75;
      color: #374151;
      position: relative;
      margin: 0;
      // 使用较小的段落间距，更接近 Word 默认效果
      margin-bottom: 0.25em;

      // 段落末尾换行符标记 - 参考 hhf-style1.jpg 样式
      &::after {
        content: '↵';
        color: #1a73e8;
        margin-left: 2px;
        font-size: 0.85em;
        opacity: 0.6;
        user-select: none;
        pointer-events: none;
      }
    }

    h1 {
      font-size: 2em;
      font-weight: 700;
      color: #111827;
      margin-top: 1.5em;
      margin-bottom: 0.5em;
    }

    h2 {
      font-size: 1.5em;
      font-weight: 600;
      color: #1f2937;
      margin-top: 1.25em;
      margin-bottom: 0.5em;
    }

    h3 {
      font-size: 1.25em;
      font-weight: 600;
      color: #374151;
      margin-top: 1em;
      margin-bottom: 0.5em;
    }

    // 标题 h4-h6 样式
    h4 {
      font-size: 1.1em;
      font-weight: 600;
      color: #374151;
      margin-top: 0.75em;
      margin-bottom: 0.5em;
    }

    h5 {
      font-size: 1em;
      font-weight: 600;
      color: #4b5563;
      margin-top: 0.5em;
      margin-bottom: 0.25em;
    }

    h6 {
      font-size: 0.9em;
      font-weight: 600;
      color: #6b7280;
      margin-top: 0.5em;
      margin-bottom: 0.25em;
    }

    ul,
    ol {
      padding-left: 1.5em;
      margin-top: 0.5em;
      margin-bottom: 0.5em;
    }

    ul {
      list-style-type: disc;
    }

    ol {
      list-style-type: decimal;
    }

    li {
      margin: 0.25em 0;
    }

    blockquote {
      padding-left: 1em;
      border-left: 3px solid #2563eb;
      color: #6b7280;
      font-style: italic;
      margin: 0.75em 0;
    }

    code {
      background: #f3f4f6;
      color: #dc2626;
      padding: 0.125em 0.25em;
      border-radius: 4px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.9em;
    }

    pre {
      background: #1f2937;
      color: #f9fafb;
      padding: 1em;
      border-radius: 8px;
      overflow-x: auto;
      margin: 0.75em 0;

      code {
        background: transparent;
        color: inherit;
        padding: 0;
      }
    }

    mark {
      background: #fef08a;
      padding: 0.125em 0;
    }

    a {
      color: #2563eb;
      text-decoration: underline;
      cursor: pointer;

      &:hover {
        color: #1d4ed8;
      }
    }

    hr {
      border: none;
      border-top: 2px solid #e5e7eb;
      margin: 2em 0;

      // 红头文件红色横线
      &.red-line,
      &[data-line-color='red'] {
        border-top-color: #ff0000;
      }
    }

    img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;

      &.editor-image {
        cursor: default;
      }
    }

    // 可调整大小的图片容器
    .resizable-image-wrapper {
      display: inline-block;
      margin: 8px 0;
    }

    // 分页符样式
    .page-break-wrapper {
      display: block;
      margin: 0;
    }

    // 表格样式
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
      overflow: hidden;
      border-radius: 8px;
      border: 1px solid #e5e7eb;

      th,
      td {
        border: 1px solid #e5e7eb;
        padding: 8px 12px;
        text-align: left;
        min-width: 100px;
      }

      th {
        background: #f9fafb;
        font-weight: 600;
        color: #374151;
      }

      td {
        background: #fff;
      }

      tr:hover td {
        background: #f9fafb;
      }
    }

    // 任务列表样式
    ul[data-type='taskList'] {
      list-style: none;
      padding-left: 0;

      li {
        display: flex;
        align-items: flex-start;
        gap: 8px;

        > label {
          flex-shrink: 0;
          margin-top: 4px;

          input[type='checkbox'] {
            width: 16px;
            height: 16px;
            cursor: pointer;
            accent-color: #2563eb;
          }
        }

        > div {
          flex: 1;
        }

        &[data-checked='true'] > div {
          text-decoration: line-through;
          color: #9ca3af;
        }
      }
    }

    // 占位符样式
    p.is-editor-empty:first-child::before {
      content: attr(data-placeholder);
      color: #9ca3af;
      float: left;
      height: 0;
      pointer-events: none;
    }
  }
}

// 协同光标样式 - 参考 https://tiptap.dev/docs/editor/extensions/functionality/collaboration-caret
// Tiptap v3 使用 collaboration-carets__* 类名

// :deep(.collaboration-cursor__caret),
:deep(.collaboration-carets__caret) {
  position: relative;
  margin-left: -1px;
  margin-right: -1px;
  border-left: 1px solid;
  border-right: 1px solid;
  border-color: inherit;
  word-break: normal;
  pointer-events: none;
}

// :deep(.collaboration-carets__label),
// :deep(.collaboration-cursor__label) {
:deep(.collaboration-carets__label) {
  position: absolute;
  top: -1.4em;
  left: -1px;
  font-size: 16px;
  font-style: normal;
  font-weight: 600;
  line-height: normal;
  user-select: none;
  color: #fff;
  padding: 0.1rem 0.3rem;
  border-radius: 4px 4px 4px 0;
  white-space: nowrap;
  pointer-events: none;
}

// 选中文本的协同高亮
:deep(.ProseMirror-yjs-selection) {
  background-color: var(--selection-color, rgba(37, 99, 235, 0.2));
}

// 预览相关样式
.preview-tabs {
  margin-bottom: 16px;
}

.preview-container {
  max-height: 60vh;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.html-preview {
  padding: 24px;
  background: #fff;

  :deep(h1) {
    font-size: 2em;
    font-weight: 700;
    margin: 0.67em 0;
  }
  :deep(h2) {
    font-size: 1.5em;
    font-weight: 600;
    margin-top: 1.5em;
  }
  :deep(h3) {
    font-size: 1.25em;
    font-weight: 600;
  }
  :deep(p) {
    margin: 1em 0;
    line-height: 1.8;
  }
  :deep(ul),
  :deep(ol) {
    padding-left: 2em;
    margin: 1em 0;
  }
  :deep(blockquote) {
    border-left: 4px solid #2563eb;
    padding-left: 1em;
    margin: 1em 0;
    color: #666;
  }
  :deep(code) {
    background: #f3f4f6;
    padding: 0.2em 0.4em;
    border-radius: 4px;
    font-size: 0.9em;
  }
  :deep(pre) {
    background: #1f2937;
    color: #f9fafb;
    padding: 1em;
    border-radius: 8px;
    overflow-x: auto;
  }
  :deep(table) {
    border-collapse: collapse;
    width: 100%;
    max-width: 100%;
    table-layout: auto;
    margin: 1em 0;
  }
  :deep(th),
  :deep(td) {
    border: 1px solid #e5e7eb;
    padding: 8px 12px;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
  :deep(th) {
    background: #f9fafb;
  }
  :deep(img) {
    max-width: 100%;
    height: auto;
    display: block;
  }
  :deep(mark) {
    background: #fef08a;
  }
  :deep(a) {
    color: #2563eb;
    text-decoration: underline;
  }
}

.html-source {
  background: #1f2937;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;

  pre {
    margin: 0;
    color: #f9fafb;
    font-family: 'Fira Code', 'Consolas', monospace;
    font-size: 13px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-all;
  }
}

.pdf-preview-container {
  max-height: 60vh;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.pdf-preview {
  padding: 40px;
  max-width: 800px;
  margin: 0 auto;

  :deep(h1) {
    font-size: 2em;
    font-weight: 700;
    margin: 0.67em 0;
  }
  :deep(h2) {
    font-size: 1.5em;
    font-weight: 600;
    margin-top: 1.5em;
  }
  :deep(h3) {
    font-size: 1.25em;
    font-weight: 600;
  }
  :deep(p) {
    margin: 1em 0;
    line-height: 1.8;
  }
  :deep(ul),
  :deep(ol) {
    padding-left: 2em;
  }
  :deep(blockquote) {
    border-left: 4px solid #2563eb;
    padding-left: 1em;
    color: #666;
  }
  :deep(table) {
    border-collapse: collapse;
    width: 100%;
    max-width: 100%;
    table-layout: auto;
  }
  :deep(th),
  :deep(td) {
    border: 1px solid #e5e7eb;
    padding: 8px 12px;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
  :deep(img) {
    max-width: 100%;
    height: auto;
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

// 分页符全局样式
:global(.page-break) {
  display: block;
  page-break-after: always;
  break-after: page;
}

// 打印时分页符样式
@media print {
  :global(.page-break-wrapper) {
    margin: 0;
    height: 0;
    page-break-after: always;
    break-after: page;
  }

  :global(.page-break-container) {
    display: none;
  }
}

// ==================== 官方 DragHandle 样式 ====================
// DragHandle 容器
.drag-handle-container {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

// 添加段落按钮
.drag-handle-plus {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #9ca3af;
  border-radius: 4px;
  transition: all 0.15s ease;

  &:hover {
    background: #e8f0fe;
    color: #1a73e8;
  }

  :deep(svg) {
    width: 16px;
    height: 16px;
  }
}

// 拖动手柄
.drag-handle-grip {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  color: #9ca3af;
  border-radius: 4px;
  transition: all 0.15s ease;

  &:hover {
    background: #f3f4f6;
    color: #6b7280;
  }

  &:active {
    cursor: grabbing;
    background: #e5e7eb;
  }

  :deep(svg) {
    width: 16px;
    height: 16px;
  }
}

// 拖动中的元素样式
:deep(.ProseMirror-selectednode) {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
  border-radius: 4px;
}

// 块级元素悬停时的样式
.tiptap-content :deep(.tiptap) {
  > p,
  > h1,
  > h2,
  > h3,
  > h4,
  > h5,
  > h6,
  > blockquote,
  > pre,
  > ul,
  > ol,
  > table,
  > div {
    position: relative;
    transition: background 0.15s ease;

    &:hover {
      background: rgba(37, 99, 235, 0.02);
    }
  }
}

// ==================== BubbleMenu 气泡菜单样式 ====================
// 参考 https://tiptap.dev/docs/editor/extensions/functionality/bubble-menu
.bubble-menu {
  display: flex;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  border: 1px solid #e5e7eb;
  overflow: visible;
}

.bubble-menu-container {
  display: flex;
  align-items: center;
  padding: 4px;
  gap: 2px;
}

.bubble-menu-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #6b7280;
  border-radius: 6px;
  transition: all 0.15s ease;

  &:hover {
    background: #f3f4f6;
    color: #374151;
  }

  &.is-active {
    background: #e8f0fe;
    color: #1a73e8;
  }

  :deep(svg) {
    width: 18px;
    height: 18px;
  }
}

.bubble-menu-divider {
  width: 1px;
  height: 20px;
  background: #e5e7eb;
  margin: 0 4px;
}
</style>
