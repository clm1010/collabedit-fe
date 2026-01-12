<template>
  <div class="markdown-editor-wrapper">
    <!-- 工具栏 - 只读模式下隐藏 -->
    <div v-if="editor && !loading && editable" class="editor-toolbar">
      <div class="toolbar-group">
        <!-- 导入 Word -->
        <button
          class="toolbar-btn toolbar-btn-text"
          @click="handleImportWord"
          title="导入 Word 文档 (.docx)"
        >
          <Icon icon="mdi:file-word" />
          <span class="btn-text">导入Word</span>
        </button>
        <!-- 导入 Markdown -->
        <button
          class="toolbar-btn toolbar-btn-text"
          @click="handleImportMarkdown"
          title="导入 Markdown 文件 (.md)"
        >
          <Icon icon="mdi:language-markdown" />
          <span class="btn-text">导入MD</span>
        </button>
        <!-- 导出 Markdown -->
        <button
          class="toolbar-btn toolbar-btn-text"
          @click="handleExportMarkdown"
          title="导出为 Markdown 文件"
        >
          <Icon icon="mdi:file-export" />
          <span class="btn-text">导出MD</span>
        </button>
        <!-- 预览 - 参考训练文档工具栏样式 -->
        <el-tooltip content="文档预览" placement="bottom" :show-after="500">
          <button class="toolbar-btn toolbar-btn-text" @click="handlePreview">
            <Icon icon="mdi:file-eye-outline" />
            <span class="btn-text">文档预览</span>
          </button>
        </el-tooltip>
        <div class="toolbar-divider"></div>
      </div>

      <div class="toolbar-group">
        <!-- 撤销/重做 -->
        <button
          class="toolbar-btn"
          @click="editor?.chain().focus().undo().run()"
          :disabled="!editor?.can().undo()"
          title="撤销"
        >
          <Icon icon="mdi:undo" />
        </button>
        <button
          class="toolbar-btn"
          @click="editor?.chain().focus().redo().run()"
          :disabled="!editor?.can().redo()"
          title="重做"
        >
          <Icon icon="mdi:redo" />
        </button>
        <div class="toolbar-divider"></div>
      </div>

      <div class="toolbar-group">
        <!-- 标题 -->
        <el-dropdown trigger="click" @command="handleHeading">
          <button class="toolbar-btn" title="标题">
            <Icon icon="mdi:format-header-pound" />
            <Icon icon="mdi:chevron-down" class="ml-0.5 text-xs" />
          </button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="1">标题 1</el-dropdown-item>
              <el-dropdown-item command="2">标题 2</el-dropdown-item>
              <el-dropdown-item command="3">标题 3</el-dropdown-item>
              <el-dropdown-item command="0">正文</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <div class="toolbar-divider"></div>
      </div>

      <div class="toolbar-group">
        <!-- 格式化 -->
        <button
          class="toolbar-btn"
          :class="{ active: editor?.isActive('bold') }"
          @click="editor?.chain().focus().toggleBold().run()"
          title="粗体 (Ctrl+B)"
        >
          <Icon icon="mdi:format-bold" />
        </button>
        <button
          class="toolbar-btn"
          :class="{ active: editor?.isActive('italic') }"
          @click="editor?.chain().focus().toggleItalic().run()"
          title="斜体 (Ctrl+I)"
        >
          <Icon icon="mdi:format-italic" />
        </button>
        <button
          class="toolbar-btn"
          :class="{ active: editor?.isActive('underline') }"
          @click="editor?.chain().focus().toggleUnderline().run()"
          title="下划线 (Ctrl+U)"
        >
          <Icon icon="mdi:format-underline" />
        </button>
        <button
          class="toolbar-btn"
          :class="{ active: editor?.isActive('strike') }"
          @click="editor?.chain().focus().toggleStrike().run()"
          title="删除线"
        >
          <Icon icon="mdi:format-strikethrough" />
        </button>
        <button
          class="toolbar-btn"
          :class="{ active: editor?.isActive('code') }"
          @click="editor?.chain().focus().toggleCode().run()"
          title="行内代码"
        >
          <Icon icon="mdi:code-tags" />
        </button>
        <!-- 清除格式 -->
        <button class="toolbar-btn" @click="clearFormat" title="清除格式">
          <Icon icon="mdi:format-clear" />
        </button>
        <div class="toolbar-divider"></div>
      </div>

      <div class="toolbar-group">
        <!-- 列表 -->
        <button
          class="toolbar-btn"
          :class="{ active: editor?.isActive('bulletList') }"
          @click="editor?.chain().focus().toggleBulletList().run()"
          title="无序列表"
        >
          <Icon icon="mdi:format-list-bulleted" />
        </button>
        <button
          class="toolbar-btn"
          :class="{ active: editor?.isActive('orderedList') }"
          @click="editor?.chain().focus().toggleOrderedList().run()"
          title="有序列表"
        >
          <Icon icon="mdi:format-list-numbered" />
        </button>
        <button
          class="toolbar-btn"
          :class="{ active: editor?.isActive('taskList') }"
          @click="editor?.chain().focus().toggleTaskList().run()"
          title="任务列表"
        >
          <Icon icon="mdi:checkbox-marked-outline" />
        </button>
        <div class="toolbar-divider"></div>
      </div>

      <div class="toolbar-group">
        <!-- 引用/代码块 -->
        <button
          class="toolbar-btn"
          :class="{ active: editor?.isActive('blockquote') }"
          @click="editor?.chain().focus().toggleBlockquote().run()"
          title="引用"
        >
          <Icon icon="mdi:format-quote-close" />
        </button>
        <button
          class="toolbar-btn"
          :class="{ active: editor?.isActive('codeBlock') }"
          @click="editor?.chain().focus().toggleCodeBlock().run()"
          title="代码块"
        >
          <Icon icon="mdi:code-braces" />
        </button>
        <button
          class="toolbar-btn"
          @click="editor?.chain().focus().setHorizontalRule().run()"
          title="分割线"
        >
          <Icon icon="mdi:minus" />
        </button>
        <div class="toolbar-divider"></div>
      </div>

      <div class="toolbar-group">
        <!-- 表格 -->
        <el-popover
          placement="bottom"
          :width="220"
          trigger="click"
          v-model:visible="tablePopoverVisible"
        >
          <template #reference>
            <button
              class="toolbar-btn"
              :class="{ active: editor?.isActive('table') }"
              title="插入表格"
            >
              <Icon icon="mdi:table" />
              <Icon icon="mdi:chevron-down" class="ml-0.5 text-xs" />
            </button>
          </template>
          <div class="table-grid-selector">
            <div class="table-grid-header">插入表格</div>
            <div class="table-grid" @mouseleave="resetTableSelection">
              <div v-for="row in 8" :key="row" class="table-grid-row">
                <div
                  v-for="col in 8"
                  :key="col"
                  class="table-grid-cell"
                  :class="{ selected: row <= selectedRows && col <= selectedCols }"
                  @mouseenter="selectTableSize(row, col)"
                  @click="insertTable(row, col)"
                ></div>
              </div>
            </div>
            <div class="table-grid-footer">
              {{ selectedRows > 0 ? `${selectedRows} × ${selectedCols}` : '选择表格大小' }}
            </div>
          </div>
        </el-popover>
        <!-- 表格操作按钮（仅在表格中显示） -->
        <template v-if="editor?.isActive('table')">
          <button
            class="toolbar-btn"
            @click="editor?.chain().focus().addColumnBefore().run()"
            title="在左侧插入列"
          >
            <Icon icon="mdi:table-column-plus-before" />
          </button>
          <button
            class="toolbar-btn"
            @click="editor?.chain().focus().addColumnAfter().run()"
            title="在右侧插入列"
          >
            <Icon icon="mdi:table-column-plus-after" />
          </button>
          <button
            class="toolbar-btn"
            @click="editor?.chain().focus().deleteColumn().run()"
            title="删除列"
          >
            <Icon icon="mdi:table-column-remove" />
          </button>
          <button
            class="toolbar-btn"
            @click="editor?.chain().focus().addRowBefore().run()"
            title="在上方插入行"
          >
            <Icon icon="mdi:table-row-plus-before" />
          </button>
          <button
            class="toolbar-btn"
            @click="editor?.chain().focus().addRowAfter().run()"
            title="在下方插入行"
          >
            <Icon icon="mdi:table-row-plus-after" />
          </button>
          <button
            class="toolbar-btn"
            @click="editor?.chain().focus().deleteRow().run()"
            title="删除行"
          >
            <Icon icon="mdi:table-row-remove" />
          </button>
          <button
            class="toolbar-btn"
            @click="editor?.chain().focus().toggleHeaderRow().run()"
            title="切换表头行"
          >
            <Icon icon="mdi:table-headers-eye" />
          </button>
          <button
            class="toolbar-btn"
            @click="editor?.chain().focus().mergeCells().run()"
            title="合并单元格"
          >
            <Icon icon="mdi:table-merge-cells" />
          </button>
          <button
            class="toolbar-btn"
            @click="editor?.chain().focus().splitCell().run()"
            title="拆分单元格"
          >
            <Icon icon="mdi:table-split-cell" />
          </button>
          <button
            class="toolbar-btn text-red-500"
            @click="editor?.chain().focus().deleteTable().run()"
            title="删除表格"
          >
            <Icon icon="mdi:table-remove" />
          </button>
        </template>
        <div class="toolbar-divider"></div>
      </div>

      <div class="toolbar-group">
        <!-- 对齐 -->
        <button
          class="toolbar-btn"
          :class="{ active: editor?.isActive({ textAlign: 'left' }) }"
          @click="editor?.chain().focus().setTextAlign('left').run()"
          title="左对齐"
        >
          <Icon icon="mdi:format-align-left" />
        </button>
        <button
          class="toolbar-btn"
          :class="{ active: editor?.isActive({ textAlign: 'center' }) }"
          @click="editor?.chain().focus().setTextAlign('center').run()"
          title="居中"
        >
          <Icon icon="mdi:format-align-center" />
        </button>
        <button
          class="toolbar-btn"
          :class="{ active: editor?.isActive({ textAlign: 'right' }) }"
          @click="editor?.chain().focus().setTextAlign('right').run()"
          title="右对齐"
        >
          <Icon icon="mdi:format-align-right" />
        </button>
      </div>
    </div>

    <!-- 隐藏的文件输入框 -->
    <input
      ref="wordFileInputRef"
      type="file"
      accept=".docx"
      style="display: none"
      @change="handleWordFileChange"
    />
    <input
      ref="markdownFileInputRef"
      type="file"
      accept=".md,.markdown"
      style="display: none"
      @change="handleMarkdownFileChange"
    />

    <!-- 预览对话框（全屏样式） -->
    <el-dialog
      v-model="previewDialogVisible"
      :fullscreen="true"
      :show-close="false"
      class="document-preview-dialog"
      :close-on-click-modal="false"
    >
      <template #header>
        <div class="preview-header">
          <div class="header-left">
            <button class="menu-btn" @click="togglePreviewSidebar">
              <Icon icon="mdi:menu" />
            </button>
            <span class="doc-title">{{ documentTitle || props.title || '文档预览' }}</span>
          </div>
          <div class="header-right">
            <button class="close-btn" @click="previewDialogVisible = false">
              <Icon icon="mdi:close" />
            </button>
          </div>
        </div>
      </template>
      <div class="preview-body">
        <div class="preview-content-wrapper">
          <div class="preview-page" :style="{ transform: `scale(${previewZoom / 100})` }">
            <div class="preview-text-content" v-html="previewContent"></div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="preview-footer">
          <div class="footer-left">
            <button class="sidebar-btn" @click="togglePreviewSidebar">
              <Icon icon="mdi:dock-left" />
              <span>打开边栏</span>
            </button>
          </div>
          <div class="footer-right">
            <button class="zoom-btn" @click="togglePreviewFullscreen" title="全屏">
              <Icon icon="mdi:fullscreen" />
            </button>
            <div class="zoom-slider">
              <button class="zoom-btn" @click="zoomOut" title="缩小">
                <Icon icon="mdi:minus" />
              </button>
              <el-slider
                v-model="previewZoom"
                :min="50"
                :max="200"
                :step="10"
                :show-tooltip="false"
                class="zoom-slider-input"
              />
              <button class="zoom-btn" @click="zoomIn" title="放大">
                <Icon icon="mdi:plus" />
              </button>
            </div>
            <button class="zoom-btn fit-btn" @click="fitToWidth" title="适应宽度">
              <Icon icon="mdi:fit-to-page-outline" />
            </button>
            <span class="zoom-value">{{ previewZoom }}%</span>
          </div>
        </div>
      </template>
    </el-dialog>

    <!-- 编辑器内容区域 -->
    <div class="editor-content-wrapper" ref="contentWrapperRef">
      <div v-if="loading || !editor" class="p-6 h-full">
        <el-skeleton :rows="12" animated />
      </div>
      <template v-else>
        <div class="page-container">
          <div class="page-content">
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
            <editor-content :editor="editor" class="markdown-content" />

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
                <button
                  class="bubble-menu-btn"
                  :class="{ 'is-active': editor?.isActive('highlight') }"
                  @click="editor?.chain().focus().toggleHighlight().run()"
                  title="高亮"
                >
                  <Icon icon="mdi:format-color-highlight" />
                </button>
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
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck - 忽略 Tiptap 版本不兼容导致的类型问题
import { ref, onBeforeUnmount, watch, onMounted, toRefs, nextTick } from 'vue'
import { isNil, isEmpty } from 'lodash-es'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import { BubbleMenuPlugin } from '@tiptap/extension-bubble-menu'
import { StarterKit } from '@tiptap/starter-kit'
import { Collaboration } from '@tiptap/extension-collaboration'
import { CollaborationCaret } from '@tiptap/extension-collaboration-caret'
import { Placeholder } from '@tiptap/extensions'
import { TextAlign } from '@tiptap/extension-text-align'
import { Highlight } from '@tiptap/extension-highlight'
import { Link } from '@tiptap/extension-link'
import { TaskList, TaskItem } from '@tiptap/extension-list'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import { DragHandle } from '@tiptap/extension-drag-handle-vue-3'
import { Markdown } from '@tiptap/markdown'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { Icon } from '@/components/Icon'
import { ElMessage } from 'element-plus'
// 文件解析工具
import {
  parseWordDocument,
  parseMarkdownDocument,
  exportMarkdown,
  generatePreviewHtml,
  htmlToMarkdown
} from '../utils/fileParser'
// Link Popover 组件
import LinkPopover from './LinkPopover.vue'

// Props
interface Props {
  ydoc: Y.Doc
  provider: WebsocketProvider
  user: {
    name: string
    color: string
    avatar?: string
  }
  placeholder?: string
  title?: string
  loading?: boolean
  editable?: boolean // 是否可编辑（只读模式为 false）
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '开始编写模板内容...',
  title: '模板文档',
  loading: false,
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

// 内容区域引用
const contentWrapperRef = ref<HTMLElement | null>(null)

// 泡泡菜单引用 - 参考 https://tiptap.dev/docs/editor/extensions/functionality/bubble-menu
const bubbleMenuRef = ref<HTMLElement | null>(null)

// BubbleMenu 插件 key（用于卸载时清理）
let bubbleMenuPluginKey: string | null = null

// 文件输入引用
const wordFileInputRef = ref<HTMLInputElement | null>(null)
const markdownFileInputRef = ref<HTMLInputElement | null>(null)

// 预览相关状态
const previewDialogVisible = ref(false)
const previewContent = ref('')
const documentTitle = ref('')
const previewZoom = ref(100)
const previewSidebarVisible = ref(false)

// LinkPopover 相关状态
const linkPopoverVisible = ref(false)
const linkPopoverUrl = ref('')
const linkPopoverTriggerRect = ref<DOMRect | null>(null)
const linkBtnRef = ref<HTMLElement | null>(null)

// 规范化导入的 HTML，确保包含可放置光标的文本块
const normalizeImportedHtml = (html: string): string => {
  const content = (html || '').trim()
  if (!content) return '<p></p>'

  const hasBlock =
    /^<(p|h[1-6]|ul|ol|table|blockquote|pre|div|section|article|figure|img|hr)/i.test(content)

  const wrapped = hasBlock ? content : `<p>${content}</p>`

  // 追加空段落，确保有可用的文本块，避免 TextSelection 错误
  return `${wrapped}<p></p>`
}

// 将导入的 HTML 写入编辑器，并安全地设置光标
const applyImportedHtml = async (html: string, fileName?: string) => {
  if (isComponentDestroyed || isNil(editor.value)) return

  const safeHtml = normalizeImportedHtml(html)

  try {
    editor.value.commands.clearContent(false)
    editor.value.commands.setContent(safeHtml, false)
  } catch (error) {
    console.error('写入导入内容失败:', error)
    editor.value.commands.clearContent(false)
    editor.value.commands.setContent('<p></p>', false)
    throw new Error('导入内容写入编辑器失败，请检查文件格式是否包含有效文本或块元素')
  }

  await nextTick()

  requestAnimationFrame(() => {
    if (isComponentDestroyed || isNil(editor.value)) return

    try {
      const { doc } = editor.value!.state
      let targetPos = 1
      let hasTextBlock = false

      doc.descendants((node, pos) => {
        if (node.isTextblock && node.content.size > 0) {
          targetPos = pos + 1
          hasTextBlock = true
          return false
        }
        return true
      })

      if (hasTextBlock) {
        editor.value?.commands.setTextSelection(targetPos)
        if (props.editable) {
          editor.value?.commands.focus()
        }
      }
    } catch (focusError) {
      console.warn('设置光标失败（已忽略）:', focusError)
    }
  })

  if (fileName) {
    ElMessage.success(`成功导入 ${fileName}`)
  }
}

// 提取文档标题（优先 h1-h6，否则首段文本）
const extractDocumentTitle = (html: string): string => {
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = html || ''

  for (let i = 1; i <= 6; i++) {
    const heading = tempDiv.querySelector(`h${i}`)
    if (heading && heading.textContent?.trim()) {
      return heading.textContent.trim()
    }
  }

  const firstParagraph = tempDiv.querySelector('p')
  if (firstParagraph && firstParagraph.textContent?.trim()) {
    const text = firstParagraph.textContent.trim()
    return text.length > 30 ? `${text.substring(0, 30)}...` : text
  }

  return '文档预览'
}

// 表格选择器状态
const tablePopoverVisible = ref(false)
const selectedRows = ref(0)
const selectedCols = ref(0)

// 编辑器实例
const editor = useEditor({
  editable: props.editable, // 根据 props 控制是否可编辑
  extensions: [
    StarterKit.configure({
      // Tiptap v3: history 重命名为 undoRedo
      undoRedo: false, // 禁用 undoRedo，Collaboration 会处理
      // 禁用 StarterKit 自带的 Link，使用自定义配置
      link: false
    }),
    // 协同编辑
    Collaboration.configure({
      document: props.ydoc
    }),
    // Tiptap v3: 协同光标扩展重命名为 CollaborationCaret
    CollaborationCaret.configure({
      provider: props.provider,
      user: {
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
    // 任务列表
    TaskList,
    TaskItem.configure({
      nested: true
    }),
    // 表格扩展
    Table.configure({
      resizable: true,
      HTMLAttributes: {
        class: 'editor-table'
      }
    }),
    TableRow,
    TableCell,
    TableHeader,
    // Markdown 扩展 - 支持 Markdown 内容的解析和序列化
    // 参考: https://tiptap.dev/docs/editor/markdown
    Markdown
  ],
  onUpdate: ({ editor }) => {
    // 防止组件销毁后触发回调
    if (isComponentDestroyed) return
    emit('update', editor.getHTML())
  },
  onCreate: ({ editor }) => {
    // 防止组件销毁后触发回调
    if (isComponentDestroyed) return
    emit('ready', editor)
  }
})

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
  const endPos = pos + node.nodeSize

  editor.value.chain().focus().insertContentAt(endPos, { type: 'paragraph' }).run()
}

// ==================== BubbleMenu 相关 ====================
// 在 onMounted 中注册 BubbleMenu 插件
onMounted(() => {
  // 只读模式也需要注册，shouldShow 会控制显示
  if (!isNil(editor.value) && !isNil(bubbleMenuRef.value)) {
    registerBubbleMenu()
  }
})

// 处理编辑器点击事件，检测是否点击了链接
const handleEditorClick = (event: MouseEvent) => {
  if (isComponentDestroyed || isNil(editor.value) || !props.editable) return

  const target = event.target as HTMLElement

  // 检查是否点击了链接元素
  const linkElement = target.closest('a')
  if (linkElement) {
    event.preventDefault()

    // 获取链接的 URL
    const href = linkElement.getAttribute('href') || ''
    linkPopoverUrl.value = href

    // 获取链接元素的位置作为触发点
    linkPopoverTriggerRect.value = linkElement.getBoundingClientRect()

    // 选中链接文本
    const { state } = editor.value
    const { doc } = state
    let linkPos = -1

    // 查找链接在文档中的位置
    doc.descendants((node, pos) => {
      if (node.isText && node.marks.some((mark) => mark.type.name === 'link')) {
        const dom = editor.value!.view.nodeDOM(pos)
        if (dom === linkElement || (dom as HTMLElement)?.contains?.(linkElement)) {
          linkPos = pos
          return false
        }
      }
      return true
    })

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

// 注册 BubbleMenu 插件 - 参考 https://github.com/ueberdosis/tiptap/tree/main/packages/extension-bubble-menu
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

// 处理标题选择
const handleHeading = (level: string) => {
  if (isNil(editor.value)) return
  const levelNum = parseInt(level)
  if (levelNum === 0) {
    editor.value.chain().focus().setParagraph().run()
  } else {
    editor.value
      .chain()
      .focus()
      .toggleHeading({ level: levelNum as 1 | 2 | 3 })
      .run()
  }
}

// ==================== 导入功能 ====================
// 导入 Word 按钮点击
const handleImportWord = () => {
  wordFileInputRef.value?.click()
}

// 导入 Markdown 按钮点击
const handleImportMarkdown = () => {
  markdownFileInputRef.value?.click()
}

// 处理 Word 文件选择
const handleWordFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    const html = await parseWordDocument(file)

    if (html) {
      await applyImportedHtml(html, file.name)
    } else {
      ElMessage.warning('未解析到可导入的内容')
    }
  } catch (error: any) {
    console.error('导入 Word 文件失败:', error)
    const message =
      error?.message?.includes('TextSelection') || error?.message?.includes('inline content')
        ? '导入内容缺少可编辑的文本，请确认文件是否包含正文'
        : error?.message || '导入 Word 文件失败，请检查文件格式'
    ElMessage.error(message)
  }

  // 清空文件输入，允许重复选择同一文件
  target.value = ''
}

// 处理 Markdown 文件选择
const handleMarkdownFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    const html = await parseMarkdownDocument(file)

    if (html) {
      await applyImportedHtml(html, file.name)
    } else {
      ElMessage.warning('未解析到可导入的内容')
    }
  } catch (error: any) {
    console.error('导入 Markdown 文件失败:', error)
    const message =
      error?.message?.includes('TextSelection') || error?.message?.includes('inline content')
        ? '导入内容缺少可编辑的文本，请确认文件是否包含正文'
        : error?.message || '导入 Markdown 文件失败，请检查文件格式'
    ElMessage.error(message)
  }

  // 清空文件输入，允许重复选择同一文件
  target.value = ''
}

// ==================== 导出功能 ====================
// 导出 Markdown 文件
const handleExportMarkdown = () => {
  if (isNil(editor.value)) return

  try {
    // 获取 HTML 内容并转换为 Markdown
    const html = editor.value.getHTML()
    const markdown = htmlToMarkdown(html)

    // 使用工具函数导出
    exportMarkdown(markdown, props.title || '文档')

    ElMessage.success('Markdown 文件导出成功')
  } catch (error) {
    console.error('导出文件失败:', error)
    ElMessage.error('导出文件失败')
  }
}

// ==================== 预览功能 ====================
// 预览当前文档
const handlePreview = () => {
  if (isNil(editor.value)) {
    ElMessage.warning('编辑器未就绪')
    return
  }

  const html = editor.value.getHTML()
  previewContent.value = html
  documentTitle.value = extractDocumentTitle(html) || props.title || '文档预览'
  previewZoom.value = 100
  previewDialogVisible.value = true
}

// 复制 HTML
const copyHtml = async () => {
  try {
    const html = generateFullHtml()
    await navigator.clipboard.writeText(html)
    ElMessage.success('HTML 已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

// 下载 HTML
const downloadHtml = () => {
  const html = generateFullHtml()
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

// 预览控制
const togglePreviewSidebar = () => {
  previewSidebarVisible.value = !previewSidebarVisible.value
}

const togglePreviewFullscreen = () => {
  if (document.fullscreenElement) {
    document.exitFullscreen()
  } else {
    document.documentElement.requestFullscreen()
  }
}

const zoomOut = () => {
  if (previewZoom.value > 50) {
    previewZoom.value -= 10
  }
}

const zoomIn = () => {
  if (previewZoom.value < 200) {
    previewZoom.value += 10
  }
}

const fitToWidth = () => {
  previewZoom.value = 100
}

// ==================== 表格功能 ====================
// 选择表格大小
const selectTableSize = (rows: number, cols: number) => {
  selectedRows.value = rows
  selectedCols.value = cols
}

// 重置表格选择
const resetTableSelection = () => {
  selectedRows.value = 0
  selectedCols.value = 0
}

// 插入表格
const insertTable = (rows: number, cols: number) => {
  if (isNil(editor.value)) return

  editor.value.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()

  tablePopoverVisible.value = false
  resetTableSelection()
}

// ==================== 格式功能 ====================
// 清除格式
const clearFormat = () => {
  if (isNil(editor.value)) return

  editor.value.chain().focus().unsetAllMarks().clearNodes().run()
}

// 生成完整的 HTML 文档
const generateFullHtml = () => {
  if (isNil(editor.value)) return ''

  const content = editor.value.getHTML()
  const title = props.title || '模板文档'

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      line-height: 1.8;
      color: #333;
      background: #fff;
    }
    h1 { font-size: 2em; font-weight: 700; margin: 0.67em 0; }
    h2 { font-size: 1.5em; font-weight: 600; margin-top: 1.5em; }
    h3 { font-size: 1.25em; font-weight: 600; margin-top: 1.2em; }
    p { margin: 1em 0; }
    ul, ol { padding-left: 2em; margin: 1em 0; }
    ul { list-style-type: disc; }
    ol { list-style-type: decimal; }
    li { margin: 0.3em 0; }
    blockquote {
      border-left: 4px solid #2563eb;
      padding-left: 1em;
      margin: 1em 0;
      color: #666;
      font-style: italic;
    }
    code {
      background: #f3f4f6;
      padding: 0.2em 0.4em;
      border-radius: 4px;
      font-size: 0.9em;
    }
    pre {
      background: #1f2937;
      color: #f9fafb;
      padding: 1em;
      border-radius: 8px;
      overflow-x: auto;
    }
    pre code { background: transparent; color: inherit; padding: 0; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; table-layout: fixed; }
    th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; vertical-align: top; }
    th { background: #f9fafb; font-weight: 600; color: #374151; }
    tr:nth-child(even) { background: #f9fafb; }
    a { color: #2563eb; text-decoration: underline; }
    mark { background: #fef08a; padding: 0 2px; }
    strong { font-weight: 600; }
    em { font-style: italic; }
    s { text-decoration: line-through; }
    u { text-decoration: underline; }
    hr { border: none; border-top: 2px solid #e5e7eb; margin: 2em 0; }
  </style>
</head>
<body>
${content}
</body>
</html>`
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
  wordFileInputRef.value = null
  markdownFileInputRef.value = null
  linkBtnRef.value = null

  // 清理预览相关状态
  previewDialogVisible.value = false
  previewContent.value = ''
  documentTitle.value = ''
  previewZoom.value = 100
  previewSidebarVisible.value = false

  // 清理 LinkPopover 状态
  linkPopoverVisible.value = false
  linkPopoverUrl.value = ''
  linkPopoverTriggerRect.value = null

  // 清理表格选择器状态
  tablePopoverVisible.value = false
  selectedRows.value = 0
  selectedCols.value = 0

  // 清理 DragHandle 相关状态
  currentDragNode.value = null
})

// 获取 Markdown 内容
// 使用 htmlToMarkdown 函数将 HTML 转换为 Markdown
const getMarkdown = () => {
  if (isNil(editor.value)) return ''
  const html = editor.value.getHTML()
  return htmlToMarkdown(html)
}

// 暴露编辑器实例和方法
defineExpose({
  editor,
  getHTML: () => editor.value?.getHTML() || '',
  getMarkdown,
  generateFullHtml
})
</script>

<style lang="scss" scoped>
.markdown-editor-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f4f5f7;
  border-radius: 8px;
  overflow: hidden;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
  flex-wrap: wrap;

  .toolbar-group {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .toolbar-divider {
    width: 1px;
    height: 20px;
    background: #e5e7eb;
    margin: 0 6px;
  }

  .toolbar-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    border-radius: 4px;
    cursor: pointer;
    color: #666;
    transition: all 0.15s ease;

    &:hover:not(:disabled) {
      background: #f3f4f6;
      color: #333;
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    &.active {
      background: #e0e7ff;
      color: #4f46e5;
    }

    :deep(svg) {
      width: 18px;
      height: 18px;
    }
  }

  // 带文字的工具栏按钮
  .toolbar-btn-text {
    width: auto;
    padding: 0 8px;
    gap: 4px;

    .btn-text {
      font-size: 12px;
      white-space: nowrap;
    }
  }
}

.editor-content-wrapper {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
  background: #e8eaed;

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

    &:hover {
      background: #a8a8a8;
    }
  }
}

.page-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px 60px;
  min-height: 100%;
}

.page-content {
  width: 794px;
  min-height: 1123px;
  background: #fff;
  padding: 96px 120px;
  box-shadow:
    0 2px 12px rgba(0, 0, 0, 0.08),
    0 0 1px rgba(0, 0, 0, 0.1);
  border-radius: 2px;
}

.markdown-content {
  min-height: 100%;

  :deep(.tiptap) {
    outline: none;
    min-height: 500px;

    > * + * {
      margin-top: 0.75em;
    }

    p {
      line-height: 1.75;
      color: #374151;
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

    ul,
    ol {
      padding-left: 1.5em;
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
      margin: 1em 0;
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

    // 表格样式
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
      table-layout: fixed;
      overflow: hidden;

      td,
      th {
        border: 1px solid #e5e7eb;
        padding: 8px 12px;
        text-align: left;
        vertical-align: top;
        position: relative;
        min-width: 80px;
        box-sizing: border-box;

        > * {
          margin: 0;
        }
      }

      th {
        background: #f9fafb;
        font-weight: 600;
        color: #374151;
      }

      // 选中的单元格
      .selectedCell:after {
        background: rgba(37, 99, 235, 0.1);
        content: '';
        left: 0;
        right: 0;
        top: 0;
        bottom: 0;
        pointer-events: none;
        position: absolute;
        z-index: 2;
      }

      // 列调整手柄
      .column-resize-handle {
        background-color: #2563eb;
        bottom: -2px;
        pointer-events: none;
        position: absolute;
        right: -2px;
        top: 0;
        width: 4px;
      }

      // 表格调整手柄
      .resize-cursor {
        cursor: col-resize;
      }
    }
  }
}

// 协同光标样式 - 参考 https://tiptap.dev/docs/editor/extensions/functionality/collaboration-caret
// Tiptap v3 使用 collaboration-carets__* 类名
:deep(.collaboration-carets__caret),
:deep(.collaboration-cursor__caret) {
  position: relative;
  margin-left: -1px;
  margin-right: -1px;
  border-left: 1px solid;
  border-right: 1px solid;
  border-color: inherit;
  word-break: normal;
  pointer-events: none;
}

:deep(.collaboration-carets__label),
:deep(.collaboration-cursor__label) {
  position: absolute;
  top: -1.4em;
  left: -1px;
  font-size: 12px;
  font-style: normal;
  font-weight: 600;
  line-height: normal;
  user-select: none;
  color: #fff;
  padding: 0.1rem 0.3rem;
  border-radius: 3px 3px 3px 0;
  white-space: nowrap;
  pointer-events: none;
}

// 选中文本的协同高亮
:deep(.ProseMirror-yjs-selection) {
  background-color: var(--selection-color, rgba(37, 99, 235, 0.2));
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

// ==================== BubbleMenu 气泡菜单样式 ====================
// 参考 https://tiptap.dev/docs/editor/extensions/functionality/bubble-menu
.bubble-menu {
  display: flex;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  border: 1px solid #e5e7eb;
  overflow: hidden;
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

// ==================== 表格网格选择器样式 ====================
.table-grid-selector {
  padding: 8px;
}

.table-grid-header {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
  text-align: center;
}

.table-grid {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 4px;
  background: #f9fafb;
  border-radius: 6px;
}

.table-grid-row {
  display: flex;
  gap: 3px;
}

.table-grid-cell {
  width: 20px;
  height: 20px;
  border: 1px solid #d1d5db;
  border-radius: 3px;
  background: #fff;
  cursor: pointer;
  transition: all 0.1s ease;

  &:hover {
    border-color: #2563eb;
  }

  &.selected {
    background: #dbeafe;
    border-color: #2563eb;
  }
}

.table-grid-footer {
  font-size: 12px;
  color: #6b7280;
  text-align: center;
  margin-top: 8px;
  min-height: 18px;
}

// ==================== 预览对话框样式 ====================
.preview-tabs {
  margin-bottom: 16px;
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

:deep(.preview-dialog) {
  .el-dialog__body {
    padding: 16px;
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }
}
// ==================== 文档预览样式（对齐训练文档预览） ====================
::global(.document-preview-dialog) {
  .el-dialog__header {
    padding: 0;
    margin: 0;
  }

  .el-dialog__body {
    padding: 0;
    height: calc(100vh - 100px);
    background: #f0f0f0;
  }

  .el-dialog__footer {
    padding: 0;
    border-top: 1px solid #e0e0e0;
  }
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 16px;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;

    .menu-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: none;
      background: transparent;
      border-radius: 4px;
      cursor: pointer;
      color: #333;

      &:hover {
        background: #f0f0f0;
      }

      :deep(svg) {
        width: 24px;
        height: 24px;
      }
    }

    .doc-title {
      font-size: 16px;
      font-weight: 500;
      color: #333;
    }
  }

  .header-right {
    .close-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: none;
      background: transparent;
      border-radius: 4px;
      cursor: pointer;
      color: #666;

      &:hover {
        background: #f0f0f0;
        color: #333;
      }

      :deep(svg) {
        width: 24px;
        height: 24px;
      }
    }
  }
}

.preview-body {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  height: 100%;
  overflow: auto;
  padding: 40px 20px;
  background: #e8eaed;
}

.preview-content-wrapper {
  transform-origin: top center;
}

.preview-page {
  width: 794px;
  min-height: 1123px;
  background: #fff;
  box-shadow:
    0 2px 12px rgba(0, 0, 0, 0.1),
    0 0 1px rgba(0, 0, 0, 0.1);
  padding: 96px 120px;
  transform-origin: top center;
  position: relative;

  // 页面边角装饰
  &::before {
    content: '';
    position: absolute;
    top: 20px;
    left: 20px;
    width: 30px;
    height: 30px;
    border-left: 2px solid #ccc;
    border-top: 2px solid #ccc;
  }

  &::after {
    content: '';
    position: absolute;
    top: 20px;
    right: 20px;
    width: 30px;
    height: 30px;
    border-right: 2px solid #ccc;
    border-top: 2px solid #ccc;
  }
}

.preview-text-content {
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB',
    'Microsoft YaHei', sans-serif;
  font-size: 14px;
  line-height: 1.8;
  color: #333;

  :deep(h1) {
    font-size: 2em;
    font-weight: 700;
    margin: 0.67em 0;
    color: #1a1a1a;
  }

  :deep(h2) {
    font-size: 1.5em;
    font-weight: 600;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    color: #2a2a2a;
  }

  :deep(h3) {
    font-size: 1.25em;
    font-weight: 600;
    margin-top: 1.2em;
    margin-bottom: 0.5em;
    color: #3a3a3a;
  }

  :deep(p) {
    margin: 1em 0;
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
    font-style: italic;
    background: #f8fafc;
    padding: 0.5em 1em;
  }

  :deep(code) {
    background: #f3f4f6;
    padding: 0.2em 0.4em;
    border-radius: 4px;
    font-family: 'Fira Code', monospace;
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
    margin: 1em 0;
  }

  :deep(th),
  :deep(td) {
    border: 1px solid #e5e7eb;
    padding: 8px 12px;
  }

  :deep(th) {
    background: #f9fafb;
    font-weight: 600;
  }

  :deep(img) {
    max-width: 100%;
    height: auto;
    border-radius: 4px;
  }

  :deep(a) {
    color: #2563eb;
    text-decoration: underline;
  }
}

.preview-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 16px;
  background: #fff;

  .footer-left {
    .sidebar-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border: none;
      background: transparent;
      border-radius: 4px;
      cursor: pointer;
      color: #666;
      font-size: 13px;

      &:hover {
        background: #f0f0f0;
        color: #333;
      }

      :deep(svg) {
        width: 18px;
        height: 18px;
      }
    }
  }

  .footer-right {
    display: flex;
    align-items: center;
    gap: 8px;

    .zoom-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: none;
      background: transparent;
      border-radius: 4px;
      cursor: pointer;
      color: #666;

      &:hover {
        background: #f0f0f0;
        color: #333;
      }

      :deep(svg) {
        width: 18px;
        height: 18px;
      }

      &.fit-btn {
        :deep(svg) {
          width: 20px;
          height: 20px;
        }
      }
    }

    .zoom-slider {
      display: flex;
      align-items: center;
      gap: 4px;

      .zoom-slider-input {
        width: 100px;

        :deep(.el-slider__runway) {
          height: 4px;
          background: #e0e0e0;
        }

        :deep(.el-slider__bar) {
          height: 4px;
          background: #1a73e8;
        }

        :deep(.el-slider__button) {
          width: 12px;
          height: 12px;
          border: 2px solid #1a73e8;
        }
      }
    }

    .zoom-value {
      min-width: 45px;
      font-size: 13px;
      color: #666;
      text-align: right;
    }
  }
}
</style>
