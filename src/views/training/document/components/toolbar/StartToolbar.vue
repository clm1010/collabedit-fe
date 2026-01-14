<template>
  <div class="start-toolbar">
    <!-- 撤销/重做 -->
    <div class="toolbar-group">
      <ToolbarButton
        icon="mdi:undo"
        title="撤销"
        :disabled="!editor?.can().undo()"
        @click="editor?.chain().focus().undo().run()"
      />
      <ToolbarButton
        icon="mdi:redo"
        title="重做"
        :disabled="!editor?.can().redo()"
        @click="editor?.chain().focus().redo().run()"
      />
    </div>

    <div class="toolbar-divider"></div>

    <!-- 字体选择 -->
    <div class="toolbar-group">
      <el-select
        v-model="currentFontFamily"
        class="font-select"
        placeholder="字体"
        size="small"
        @change="handleFontFamily"
      >
        <el-option
          v-for="font in fontFamilyOptions"
          :key="font.value"
          :label="font.label"
          :value="font.value"
          :style="{ fontFamily: font.value }"
        />
      </el-select>
    </div>

    <!-- 字号选择 -->
    <div class="toolbar-group">
      <el-select
        v-model="currentFontSize"
        class="size-select"
        placeholder="字号"
        size="small"
        @change="handleFontSize"
      >
        <el-option
          v-for="size in fontSizeOptions"
          :key="size.value"
          :label="size.label"
          :value="size.value"
        />
      </el-select>
      <ToolbarButton
        icon="mdi:format-font-size-increase"
        title="增大字号"
        @click="increaseFontSize"
      />
      <ToolbarButton
        icon="mdi:format-font-size-decrease"
        title="减小字号"
        @click="decreaseFontSize"
      />
    </div>

    <div class="toolbar-divider"></div>

    <!-- 格式刷/清除格式 -->
    <div class="toolbar-group">
      <ToolbarButton
        icon="mdi:format-paint"
        title="格式刷"
        :active="formatPainterActive"
        @click="toggleFormatPainter"
      />
      <ToolbarButton icon="mdi:format-clear" title="清除格式" @click="clearFormat" />
    </div>

    <div class="toolbar-divider"></div>

    <!-- 基本格式 -->
    <div class="toolbar-group">
      <ToolbarButton
        icon="mdi:format-bold"
        title="加粗"
        :active="editor?.isActive('bold')"
        @click="editor?.chain().focus().toggleBold().run()"
      />
      <ToolbarButton
        icon="mdi:format-italic"
        title="斜体"
        :active="editor?.isActive('italic')"
        @click="editor?.chain().focus().toggleItalic().run()"
      />
      <ToolbarButton
        icon="mdi:format-underline"
        title="下划线"
        :active="editor?.isActive('underline')"
        @click="editor?.chain().focus().toggleUnderline().run()"
      />
      <ToolbarButton
        icon="mdi:format-strikethrough"
        title="删除线"
        :active="editor?.isActive('strike')"
        @click="editor?.chain().focus().toggleStrike().run()"
      />
      <ToolbarButton
        icon="mdi:format-superscript"
        title="上标"
        :active="editor?.isActive('superscript')"
        @click="editor?.chain().focus().toggleSuperscript().run()"
      />
      <ToolbarButton
        icon="mdi:format-subscript"
        title="下标"
        :active="editor?.isActive('subscript')"
        @click="editor?.chain().focus().toggleSubscript().run()"
      />
    </div>

    <div class="toolbar-divider"></div>

    <!-- 颜色 -->
    <div class="toolbar-group">
      <ColorPicker
        v-model="textColor"
        icon="mdi:format-color-text"
        title="字体颜色"
        @change="handleTextColor"
      />
      <ColorPicker
        v-model="highlightColor"
        icon="mdi:format-color-highlight"
        title="字体背景颜色"
        @change="handleHighlightColor"
      />
    </div>

    <div class="toolbar-divider"></div>

    <!-- 列表 -->
    <div class="toolbar-group">
      <ToolbarButton
        icon="mdi:format-list-numbered"
        title="有序列表"
        :active="editor?.isActive('orderedList')"
        @click="editor?.chain().focus().toggleOrderedList().run()"
      />
      <ToolbarButton
        icon="mdi:format-list-bulleted"
        title="无序列表"
        :active="editor?.isActive('bulletList')"
        @click="editor?.chain().focus().toggleBulletList().run()"
      />
      <ToolbarButton
        icon="mdi:format-list-checks"
        title="任务列表"
        :active="editor?.isActive('taskList')"
        @click="editor?.chain().focus().toggleTaskList().run()"
      />
    </div>

    <div class="toolbar-divider"></div>

    <!-- 缩进和行高 -->
    <div class="toolbar-group">
      <ToolbarButton icon="mdi:format-indent-decrease" title="减少缩进" @click="decreaseIndent" />
      <ToolbarButton icon="mdi:format-indent-increase" title="增加缩进" @click="increaseIndent" />
      <el-popover placement="bottom" :width="120" trigger="click">
        <template #reference>
          <span>
            <el-tooltip content="行高" placement="bottom" :show-after="500">
              <button class="toolbar-btn">
                <Icon icon="mdi:format-line-spacing" class="btn-icon" />
                <Icon icon="ep:arrow-down" class="dropdown-arrow" />
              </button>
            </el-tooltip>
          </span>
        </template>
        <div class="line-height-menu">
          <div
            v-for="opt in lineHeightOptions"
            :key="opt.value"
            class="menu-item"
            :class="{ active: currentLineHeight === opt.value }"
            @click="handleLineHeight(opt.value as string)"
          >
            {{ opt.label }}
          </div>
        </div>
      </el-popover>
    </div>

    <div class="toolbar-divider"></div>

    <!-- 对齐方式 -->
    <div class="toolbar-group">
      <ToolbarButton
        icon="mdi:format-align-left"
        title="左对齐"
        :active="editor?.isActive({ textAlign: 'left' })"
        @click="editor?.chain().focus().setTextAlign('left').run()"
      />
      <ToolbarButton
        icon="mdi:format-align-center"
        title="居中"
        :active="editor?.isActive({ textAlign: 'center' })"
        @click="editor?.chain().focus().setTextAlign('center').run()"
      />
      <ToolbarButton
        icon="mdi:format-align-right"
        title="右对齐"
        :active="editor?.isActive({ textAlign: 'right' })"
        @click="editor?.chain().focus().setTextAlign('right').run()"
      />
      <ToolbarButton
        icon="mdi:format-align-justify"
        title="两端对齐"
        :active="editor?.isActive({ textAlign: 'justify' })"
        @click="editor?.chain().focus().setTextAlign('justify').run()"
      />
    </div>

    <div class="toolbar-divider"></div>

    <!-- 标题样式 -->
    <div class="toolbar-group heading-group">
      <div class="heading-panel" :class="{ expanded: isHeadingExpanded }">
        <!-- 第一行 -->
        <div class="heading-row">
          <button
            class="heading-btn"
            :class="{ active: editor?.isActive('paragraph') && !editor?.isActive('heading') }"
            @click="editor?.chain().focus().setParagraph().run()"
          >
            <span class="heading-title">正文</span>
            <span class="heading-label">Text</span>
          </button>
          <button
            class="heading-btn"
            :class="{ active: editor?.isActive('heading', { level: 1 }) }"
            @click="editor?.chain().focus().toggleHeading({ level: 1 }).run()"
          >
            <span class="heading-title h1">标题 1</span>
            <span class="heading-label">H1</span>
          </button>
          <button
            class="heading-btn"
            :class="{ active: editor?.isActive('heading', { level: 2 }) }"
            @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()"
          >
            <span class="heading-title h2">标题 2</span>
            <span class="heading-label">H2</span>
          </button>
          <button
            class="heading-btn"
            :class="{ active: editor?.isActive('heading', { level: 3 }) }"
            @click="editor?.chain().focus().toggleHeading({ level: 3 }).run()"
          >
            <span class="heading-title h3">标题 3</span>
            <span class="heading-label">H3</span>
          </button>
          <div class="heading-scroll">
            <button
              class="scroll-btn"
              @click="toggleHeadingExpand"
              :title="isHeadingExpanded ? '收起' : '更多'"
            >
              <Icon :icon="isHeadingExpanded ? 'mdi:chevron-up' : 'mdi:chevron-down'" />
            </button>
          </div>
        </div>
        <!-- 第二行 -->
        <div class="heading-row">
          <button
            class="heading-btn"
            :class="{ active: editor?.isActive('heading', { level: 4 }) }"
            @click="editor?.chain().focus().toggleHeading({ level: 4 }).run()"
          >
            <span class="heading-title h4">标题 4</span>
            <span class="heading-label">H4</span>
          </button>
          <button
            class="heading-btn"
            :class="{ active: editor?.isActive('heading', { level: 5 }) }"
            @click="editor?.chain().focus().toggleHeading({ level: 5 }).run()"
          >
            <span class="heading-title h5">标题 5</span>
            <span class="heading-label">H5</span>
          </button>
          <button
            class="heading-btn"
            :class="{ active: editor?.isActive('heading', { level: 6 }) }"
            @click="editor?.chain().focus().toggleHeading({ level: 6 }).run()"
          >
            <span class="heading-title h6">标题 6</span>
            <span class="heading-label">H6</span>
          </button>
        </div>
      </div>
    </div>

    <div class="toolbar-divider"></div>

    <!-- 导入/导出功能 -->
    <div class="toolbar-group">
      <el-tooltip content="导入 Word" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" @click="importWord">
          <Icon icon="mdi:file-word-outline" class="btn-icon-large" />
          <span class="btn-text">导入 Word</span>
        </button>
      </el-tooltip>
      <el-tooltip content="查找替换" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" @click="openFindReplace">
          <Icon icon="mdi:find-replace" class="btn-icon-large" />
          <span class="btn-text">查找替换</span>
        </button>
      </el-tooltip>
      <el-tooltip content="文档预览" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" @click="previewDocument">
          <Icon icon="mdi:file-eye-outline" class="btn-icon-large" />
          <span class="btn-text">文档预览</span>
        </button>
      </el-tooltip>
      <el-tooltip content="打印" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" @click="printDocument">
          <Icon icon="mdi:printer-outline" class="btn-icon-large" />
          <span class="btn-text">打印</span>
        </button>
      </el-tooltip>
    </div>

    <!-- Word 导入对话框 -->
    <el-dialog
      v-model="wordImportDialogVisible"
      title="导入 Word 文档"
      width="700px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <div class="word-import-content">
        <!-- 文件选择区域 -->
        <div class="upload-area" v-if="!wordImportFile">
          <el-upload
            class="word-uploader"
            drag
            :auto-upload="false"
            :show-file-list="false"
            accept=".docx"
            @change="handleWordFileSelect"
          >
            <Icon icon="mdi:file-word-outline" class="upload-icon" />
            <div class="upload-text">
              <p>将 Word 文档拖到此处，或<em>点击上传</em></p>
              <p class="upload-hint">仅支持 .docx 格式</p>
            </div>
          </el-upload>
        </div>

        <!-- 导入选项 -->
        <div class="import-options" v-if="wordImportFile">
          <div class="file-info">
            <Icon icon="mdi:file-word" class="file-icon" />
            <span class="file-name">{{ wordImportFile.name }}</span>
            <el-button text type="danger" size="small" @click="clearWordImport">
              <Icon icon="mdi:close" />
            </el-button>
          </div>
        </div>

        <!-- 预览区域 -->
        <div class="preview-area" v-if="wordImportPreview">
          <div class="preview-header">
            <span>预览</span>
            <el-tag type="success" size="small">解析成功</el-tag>
          </div>
          <div class="preview-content" v-html="wordImportPreview"></div>
        </div>

        <!-- 加载状态 -->
        <div class="loading-area" v-if="wordImportLoading">
          <Icon icon="eos-icons:loading" class="loading-icon" />
          <p>{{ importProgressText || '正在解析文档...' }}</p>
          <el-progress
            v-if="importProgress > 0"
            :percentage="importProgress"
            :stroke-width="8"
            class="import-progress"
          />
        </div>
      </div>
      <template #footer>
        <el-button @click="cancelWordImport">取消</el-button>
        <el-button
          type="primary"
          @click="confirmWordImport"
          :disabled="!wordImportPreview"
          :loading="wordImportLoading"
        >
          确认导入
        </el-button>
      </template>
    </el-dialog>

    <!-- 查找替换对话框 -->
    <el-dialog
      v-model="findReplaceVisible"
      title="查找和替换"
      width="480px"
      :close-on-click-modal="false"
    >
      <div class="find-replace-content">
        <div class="find-row">
          <span class="label">查找:</span>
          <el-input v-model="findText" placeholder="输入要查找的内容" @keyup.enter="findNext" />
          <el-button @click="findNext">查找下一个</el-button>
        </div>
        <div class="find-row">
          <span class="label">替换:</span>
          <el-input v-model="replaceText" placeholder="输入替换内容" />
          <el-button @click="replaceOne">替换</el-button>
          <el-button type="primary" @click="replaceAll">全部替换</el-button>
        </div>
        <div class="find-options">
          <el-checkbox v-model="matchCase">区分大小写</el-checkbox>
          <el-checkbox v-model="matchWholeWord">全字匹配</el-checkbox>
        </div>
        <div v-if="findResultCount >= 0" class="find-result">
          找到 {{ findResultCount }} 处匹配
        </div>
      </div>
    </el-dialog>

    <!-- 文档预览对话框 -->
    <el-dialog
      v-model="documentPreviewVisible"
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
            <span class="doc-title">{{ documentTitle || '示例文档' }}</span>
          </div>
          <div class="header-right">
            <button class="close-btn" @click="closeDocumentPreview">
              <Icon icon="mdi:close" />
            </button>
          </div>
        </div>
      </template>
      <div class="preview-body">
        <div class="preview-content-wrapper">
          <div class="preview-page" :style="{ transform: `scale(${previewZoom / 100})` }">
            <div class="page-content" v-html="previewContent"></div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="preview-footer">
          <div class="footer-left">
            <!-- <button class="sidebar-btn" @click="togglePreviewSidebar">
              <Icon icon="mdi:dock-left" />
              <span>打开边栏</span>
            </button> -->
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
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck - 忽略 Tiptap 自定义扩展命令的类型问题
import { ref, watch, reactive, nextTick } from 'vue'
import { Icon } from '@/components/Icon'
import { ElMessage } from 'element-plus'
import ToolbarButton from './ToolbarButton.vue'
import ColorPicker from './ColorPicker.vue'
import { fontFamilyOptions, fontSizeOptions, lineHeightOptions } from './types'
import { useEditor } from './useEditor'
import {
  isDocFormat,
  isZipFormat,
  validateDocxFile,
  parseOoxmlDocument,
  parseRedHeadDocument,
  smartParseDocument,
  parseWithDocxPreview,
  parseOoxmlDocumentEnhanced
} from '../../utils/wordParser'

// 获取编辑器实例
const editor = useEditor()

// 状态
const formatPainterActive = ref(false)
const formatPainterStyle = ref<any>(null)
const textColor = ref('#000000')
const highlightColor = ref('#FFFF00')
const currentFontFamily = ref('')
const currentFontSize = ref('')
const currentLineHeight = ref('')

// 文件输入
const wordFileInput = ref<HTMLInputElement | null>(null)

// 查找替换
const findReplaceVisible = ref(false)
const findText = ref('')
const replaceText = ref('')
const matchCase = ref(false)
const matchWholeWord = ref(false)
const findResultCount = ref(-1)

// 文档预览
const documentPreviewVisible = ref(false)
const documentTitle = ref('')
const previewContent = ref('')
const previewZoom = ref(100)
const previewSidebarVisible = ref(false)

// 监听编辑器选区变化，更新当前样式状态
watch(
  editor,
  (e) => {
    if (e) {
      // 更新当前字体
      const fontFamily = e.getAttributes('textStyle').fontFamily
      currentFontFamily.value = fontFamily || ''

      // 更新当前字号
      const fontSize = e.getAttributes('textStyle').fontSize
      currentFontSize.value = fontSize || ''
    }
  },
  { deep: true }
)

// 字体处理
const handleFontFamily = (value: string) => {
  if (!editor.value) return
  if (value) {
    editor.value.chain().focus().setFontFamily(value).run()
  } else {
    editor.value.chain().focus().unsetFontFamily().run()
  }
}

// 字号处理
const handleFontSize = (value: string) => {
  if (!editor.value) return
  if (value) {
    editor.value.chain().focus().setFontSize(value).run()
  } else {
    editor.value.chain().focus().unsetFontSize().run()
  }
}

// 增大字号 - 使用 px 单位
const fontSizeValues = [
  '9px',
  '10px',
  '11px',
  '12px',
  '14px',
  '16px',
  '18px',
  '19px',
  '20px',
  '21px',
  '22px',
  '24px',
  '26px',
  '28px',
  '29px',
  '32px',
  '35px',
  '36px',
  '42px',
  '48px',
  '56px',
  '72px',
  '96px'
]
const increaseFontSize = () => {
  if (!editor.value) return
  const current = editor.value.getAttributes('textStyle').fontSize || '16px'
  const currentIndex = fontSizeValues.findIndex((s) => s === current)
  if (currentIndex < fontSizeValues.length - 1) {
    const newSize = fontSizeValues[currentIndex + 1]
    editor.value.chain().focus().setFontSize(newSize).run()
    currentFontSize.value = newSize
  }
}

// 减小字号
const decreaseFontSize = () => {
  if (!editor.value) return
  const current = editor.value.getAttributes('textStyle').fontSize || '16px'
  const currentIndex = fontSizeValues.findIndex((s) => s === current)
  if (currentIndex > 0) {
    const newSize = fontSizeValues[currentIndex - 1]
    editor.value.chain().focus().setFontSize(newSize).run()
    currentFontSize.value = newSize
  }
}

// 格式刷
const toggleFormatPainter = () => {
  if (!editor.value) return

  if (formatPainterActive.value) {
    formatPainterActive.value = false
    formatPainterStyle.value = null
    return
  }

  // 保存当前选区的格式
  const marks = editor.value.state.selection.$from.marks()
  formatPainterStyle.value = marks
  formatPainterActive.value = true

  ElMessage.info('已复制格式，请选择要应用格式的文本')
}

// 清除格式
const clearFormat = () => {
  if (!editor.value) return
  editor.value.chain().focus().unsetAllMarks().clearNodes().run()
}

// 文字颜色
const handleTextColor = (color: string) => {
  if (!editor.value) return
  if (color) {
    editor.value.chain().focus().setColor(color).run()
  } else {
    editor.value.chain().focus().unsetColor().run()
  }
}

// 高亮颜色
const handleHighlightColor = (color: string) => {
  if (!editor.value) return
  if (color) {
    editor.value.chain().focus().setHighlight({ color }).run()
  } else {
    editor.value.chain().focus().unsetHighlight().run()
  }
}

// 减少缩进
const decreaseIndent = () => {
  if (!editor.value) return
  if (editor.value.isActive('listItem')) {
    editor.value.chain().focus().liftListItem('listItem').run()
  }
}

// 增加缩进
const increaseIndent = () => {
  if (!editor.value) return
  if (editor.value.isActive('listItem')) {
    editor.value.chain().focus().sinkListItem('listItem').run()
  }
}

// 行高处理
const handleLineHeight = (value: string) => {
  if (!editor.value) return
  currentLineHeight.value = value
  // 需要自定义扩展来支持行高
  // editor.value.chain().focus().setLineHeight(value).run()
}

// 导入 Word 对话框状态
const wordImportDialogVisible = ref(false)
const wordImportLoading = ref(false)
const wordImportPreview = ref('')
const wordImportFile = ref<File | null>(null)
const wordImportOptions = reactive({
  preserveStyles: true,
  convertImages: true,
  keepLineBreaks: true
})

// Word 导入相关状态
const wordArrayBuffer = ref<ArrayBuffer | null>(null)
const importProgress = ref(0)
const importProgressText = ref('')

// 导入 Word
const importWord = () => {
  // 重置所有状态
  wordImportDialogVisible.value = true
  wordImportPreview.value = ''
  wordImportFile.value = null
  wordArrayBuffer.value = null
  importProgress.value = 0
  importProgressText.value = ''
}

const handleWordFileSelect = async (uploadFile: any) => {
  // Element Plus Upload 组件传递的是 UploadFile 对象
  const file = uploadFile.raw || uploadFile
  if (!file) return

  // 验证文件类型 - 仅支持 .docx
  const validType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (file.type !== validType && !file.name.match(/\.docx$/i)) {
    ElMessage.error('仅支持 .docx 格式，不支持旧版 .doc 格式')
    return
  }

  wordImportFile.value = file
  wordImportLoading.value = true
  importProgress.value = 0
  importProgressText.value = '正在检测文件...'

  try {
    const arrayBuffer = await file.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)

    // 检测文件格式
    const isDoc = isDocFormat(bytes)
    const isDocx = isZipFormat(bytes)

    console.log('文件格式检测:', { isDoc, isDocx, filename: file.name })

    // 如果是 .doc 格式，提示不支持
    if (isDoc) {
      ElMessage.error('不支持旧版 .doc 格式，请将文件另存为 .docx 格式后重试')
      wordImportPreview.value = ''
      wordImportFile.value = null
      wordImportLoading.value = false
      return
    }

    // 验证是否为有效的 .docx 格式
    if (!isDocx) {
      ElMessage.error('无效的文件格式，请上传有效的 .docx 文件')
      wordImportPreview.value = ''
      wordImportFile.value = null
      wordImportLoading.value = false
      return
    }

    // 1. 文件完整性校验
    importProgressText.value = '正在校验文件完整性...'
    importProgress.value = 10
    const validation = await validateDocxFile(arrayBuffer)

    if (!validation.valid) {
      ElMessage.error(validation.error || '文件已损坏，无法导入')
      wordImportPreview.value = ''
      wordImportFile.value = null
      wordImportLoading.value = false
      return
    }

    // 2. 保存 ArrayBuffer 供后续使用
    wordArrayBuffer.value = arrayBuffer

    // 3. 使用智能策略选择最佳解析方案
    importProgress.value = 20
    importProgressText.value = '正在解析文档...'

    let html: string

    // 使用智能解析策略，根据文件大小和类型自动选择最佳方案
    // - 小文件 (<2MB): docx-preview 高保真解析
    // - 中等文件 (2-5MB): docx-preview 高保真解析
    // - 大文件 (>5MB): Web Worker 非阻塞解析
    // - 红头文件: altChunk HTML 提取
    try {
      html = await smartParseDocument(file, arrayBuffer, updateProgress)
      console.log('智能解析完成，原始HTML长度:', html?.length || 0)
    } catch (e) {
      console.warn('智能解析失败，尝试后备方案:', e)
      // 回退到原有的解析方案
      if (validation.hasAltChunk) {
        console.log('回退到红头文件方案')
        html = await parseRedHeadDocument(arrayBuffer, updateProgress)
      } else {
        console.log('回退到 OOXML 方案')
        html = await parseOoxmlDocument(arrayBuffer, updateProgress)
      }
      console.log('后备方案解析完成，HTML长度:', html?.length || 0)
    }

    // 检查解析结果
    if (!html || html.trim().length < 20) {
      console.warn('解析结果过短，尝试 mammoth 后备方案')
      await parseWithMammothFallback()
      return
    }

    // 清理和优化 HTML
    const beforeCleanLength = html.length
    html = cleanWordHtml(html)
    console.log(`cleanWordHtml: ${beforeCleanLength} -> ${html.length}`)

    // 再次检查
    if (!html || html.trim().length < 20) {
      console.warn('cleanWordHtml 后内容过短，尝试 mammoth 后备方案')
      await parseWithMammothFallback()
      return
    }

    wordImportPreview.value = html
    importProgress.value = 100
    importProgressText.value = '解析完成'

    console.log('Word 文档解析成功，最终HTML长度:', html.length)
  } catch (error) {
    console.error('Word解析失败:', error)

    // 如果解析失败，尝试使用 mammoth 作为后备方案
    console.log('解析失败，尝试使用 mammoth 后备方案...')
    try {
      await parseWithMammothFallback()
      return
    } catch (fallbackError) {
      console.error('Mammoth 后备方案也失败:', fallbackError)
    }

    ElMessage.error('Word 文档解析失败: ' + (error as Error).message)
    wordImportPreview.value = ''
  } finally {
    wordImportLoading.value = false
  }
}

// 进度更新回调
const updateProgress = (progress: number, text: string) => {
  importProgress.value = progress
  importProgressText.value = text
}

// Mammoth 后备解析方案
const parseWithMammothFallback = async () => {
  if (!wordArrayBuffer.value) return

  importProgressText.value = '正在使用后备方案解析...'

  const mammoth = await import('mammoth')

  // 配置转换选项
  const options: any = {
    styleMap: wordImportOptions.preserveStyles
      ? [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Heading 4'] => h4:fresh",
          "p[style-name='Heading 5'] => h5:fresh",
          "p[style-name='Heading 6'] => h6:fresh",
          "p[style-name='标题 1'] => h1:fresh",
          "p[style-name='标题 2'] => h2:fresh",
          "p[style-name='标题 3'] => h3:fresh",
          "p[style-name='标题 4'] => h4:fresh",
          "p[style-name='标题'] => h1:fresh",
          "r[style-name='Strong'] => strong",
          "r[style-name='Emphasis'] => em",
          "r[style-name='加粗'] => strong",
          "r[style-name='斜体'] => em",
          "r[style-name='下划线'] => u",
          "p[style-name='Quote'] => blockquote:fresh",
          "p[style-name='Block Quote'] => blockquote:fresh",
          "p[style-name='引用'] => blockquote:fresh",
          "p[style-name='List Paragraph'] => p:fresh",
          "p[style-name='列表段落'] => p:fresh",
          "p[style-name='Normal'] => p:fresh",
          "p[style-name='正文'] => p:fresh",
          'table => table',
          "p[style-name='Code'] => pre:fresh",
          "r[style-name='Code'] => code"
        ]
      : [],
    includeDefaultStyleMap: true,
    includeEmbeddedStyleMap: true
  }

  // 处理图片
  if (wordImportOptions.convertImages) {
    const mammothLib = mammoth.default || mammoth
    if (mammothLib.images && mammothLib.images.imgElement) {
      options.convertImage = mammothLib.images.imgElement((image: any) => {
        return image.read('base64').then((imageBuffer: string) => {
          const contentType = image.contentType || 'image/png'
          return {
            src: `data:${contentType};base64,${imageBuffer}`
          }
        })
      })
    }
  }

  const mammothLib = mammoth.default || mammoth
  const result = await mammothLib.convertToHtml({ arrayBuffer: wordArrayBuffer.value }, options)

  let html = result.value
  html = cleanWordHtml(html)

  wordImportPreview.value = html
  importProgress.value = 100
  importProgressText.value = '解析完成（后备方案）'

  if (result.messages.length > 0) {
    const ignoredPatterns = [
      'v:path',
      'v:fill',
      'v:stroke',
      'v:shape',
      'v:rect',
      'v:oval',
      'v:line',
      'v:imagedata',
      'v:textbox',
      'v:formulas',
      'office:office',
      'office-word',
      'urn:schemas-microsoft-com',
      'image/x-emf',
      'image/x-wmf',
      'OLEObject',
      'lock',
      'anchorlock'
    ]

    const importantWarnings = result.messages.filter((m: any) => {
      if (m.type !== 'warning') return false
      const msg = m.message || ''
      return !ignoredPatterns.some((pattern) => msg.toLowerCase().includes(pattern.toLowerCase()))
    })

    if (importantWarnings.length > 0) {
      console.warn('Word导入警告:', importantWarnings)
    }
  }
}

// 清理 Word 导出的 HTML - 保持更好的排版和样式
const cleanWordHtml = (html: string): string => {
  const originalHtml = html
  const originalLength = html.length

  // === 首先清理开头的空白和空段落 - 解决"总是空出一行"的问题 ===
  html = html.trim()
  // 移除开头的空段落（但保护内容不被完全清除）
  const beforeClean = html
  html = html.replace(/^(\s*<p[^>]*>\s*(<br\s*\/?>)?\s*<\/p>\s*)+/gi, '')
  // 移除开头的空白字符
  html = html.replace(/^\s+/, '')

  // 安全检查：如果清理后内容为空，恢复
  if (!html.trim()) {
    console.warn('cleanWordHtml: 清理开头空段落后内容为空，恢复原始内容')
    html = beforeClean
  }

  // === 处理颜色样式，确保 Tiptap 能正确解析 ===

  // 转换 font 标签为 span（Tiptap 不支持 font 标签）
  html = html.replace(
    /<font([^>]*)color\s*=\s*["']?([^"'\s>]+)["']?([^>]*)>/gi,
    '<span style="color: $2"$1$3>'
  )
  html = html.replace(/<\/font>/gi, '</span>')

  // 确保颜色值格式正确（添加 # 前缀如果缺失）
  html = html.replace(/color:\s*([A-Fa-f0-9]{6})([^A-Fa-f0-9])/gi, 'color: #$1$2')
  html = html.replace(/color:\s*([A-Fa-f0-9]{3})([^A-Fa-f0-9])/gi, 'color: #$1$2')

  // 转换常见的颜色名称为十六进制值
  const colorNameMap: Record<string, string> = {
    red: '#FF0000',
    blue: '#0000FF',
    green: '#008000',
    yellow: '#FFFF00',
    black: '#000000',
    white: '#FFFFFF',
    gray: '#808080',
    orange: '#FFA500',
    purple: '#800080',
    pink: '#FFC0CB',
    navy: '#000080',
    maroon: '#800000'
  }

  for (const [name, hex] of Object.entries(colorNameMap)) {
    const regex = new RegExp(`color:\\s*${name}([;\\s"'])`, 'gi')
    html = html.replace(regex, `color: ${hex}$1`)
  }

  // === 清理多余内容 ===

  // 移除多余的连续空段落（保留单个空段落用于间距）
  html = html.replace(/(<p>\s*<\/p>\s*){2,}/g, '<p></p>')

  // 清理多余的空格，但保留必要的空格
  html = html.replace(/&nbsp;&nbsp;+/g, ' ')

  // 移除 Word 特有的 mso- 样式，但保留其他有用的样式（如 color, font-size 等）
  html = html.replace(/mso-[^;:"]+:[^;:"]+;?\s*/gi, '')

  // 移除空的 style 属性
  html = html.replace(/style="\s*"/g, '')

  // 移除 Word 特有的 class
  html = html.replace(/class="[^"]*Mso[^"]*"/gi, '')

  // 处理分页符 - 转换为自定义分页标记
  html = html.replace(
    /<br[^>]*style="[^"]*page-break[^"]*"[^>]*>/gi,
    '<div class="page-break" data-type="page-break"></div>'
  )
  html = html.replace(
    /<p[^>]*style="[^"]*page-break-before:\s*always[^"]*"[^>]*>/gi,
    '<div class="page-break" data-type="page-break"></div><p>'
  )
  html = html.replace(
    /<p[^>]*style="[^"]*page-break-after:\s*always[^"]*"[^>]*>(.*?)<\/p>/gi,
    '<p>$1</p><div class="page-break" data-type="page-break"></div>'
  )

  // 处理红色横线（红头文件特有）
  // 1. 处理带有红色边框的空段落/div - 转换为红色 hr
  html = html.replace(
    /<(p|div)[^>]*style="[^"]*border[^"]*(?:red|#[fF]{2}0{4}|#[fF]00|rgb\s*\(\s*255\s*,\s*0\s*,\s*0\s*\))[^"]*"[^>]*>\s*(?:&nbsp;)*\s*<\/(p|div)>/gi,
    '<hr class="red-line" data-line-color="red">'
  )

  // 2. 处理只有 border-bottom 的红色横线
  html = html.replace(
    /<(p|div)[^>]*style="[^"]*border-bottom[^;]*(?:red|#[fF]{2}0{4}|#[fF]00)[^"]*"[^>]*>(\s*(?:&nbsp;)*\s*)<\/(p|div)>/gi,
    '<hr class="red-line" data-line-color="red">'
  )

  // 3. 保留已有的 hr 标签，但如果有红色样式则添加 class
  html = html.replace(
    /<hr([^>]*)style="[^"]*(?:border[^;]*)?(?:red|#[fF]{2}0{4}|#[fF]00)[^"]*"([^>]*)>/gi,
    '<hr$1 class="red-line" data-line-color="red"$2>'
  )

  // 处理图片宽度 - 限制最大宽度为编辑器可用宽度
  const MAX_IMAGE_WIDTH = 540 // 编辑器可用宽度（A4 页面 794px - 边距 240px - 一些余量）

  html = html.replace(/<img([^>]*)style="([^"]*)"/gi, (match, attrs, style) => {
    // 提取宽度和高度
    const widthMatch = style.match(/width:\s*([^;]+)/i)
    const heightMatch = style.match(/height:\s*([^;]+)/i)

    let width = 0
    let height = 0

    if (widthMatch) {
      const widthStr = widthMatch[1].trim()
      // 转换各种单位为像素
      if (widthStr.endsWith('pt')) {
        width = parseFloat(widthStr) * 1.33 // pt 转 px
      } else if (widthStr.endsWith('in')) {
        width = parseFloat(widthStr) * 96 // in 转 px
      } else if (widthStr.endsWith('cm')) {
        width = parseFloat(widthStr) * 37.8 // cm 转 px
      } else if (widthStr.endsWith('mm')) {
        width = parseFloat(widthStr) * 3.78 // mm 转 px
      } else if (widthStr.endsWith('%')) {
        width = 0 // 百分比不处理，让浏览器自动计算
      } else {
        width = parseFloat(widthStr) || 0
      }
    }

    if (heightMatch) {
      const heightStr = heightMatch[1].trim()
      if (heightStr.endsWith('pt')) {
        height = parseFloat(heightStr) * 1.33
      } else if (heightStr.endsWith('in')) {
        height = parseFloat(heightStr) * 96
      } else if (heightStr.endsWith('cm')) {
        height = parseFloat(heightStr) * 37.8
      } else if (heightStr.endsWith('mm')) {
        height = parseFloat(heightStr) * 3.78
      } else if (heightStr.endsWith('%')) {
        height = 0
      } else {
        height = parseFloat(heightStr) || 0
      }
    }

    // 限制最大宽度，确保不会溢出容器
    if (width > MAX_IMAGE_WIDTH) {
      const ratio = height / width
      width = MAX_IMAGE_WIDTH
      height = width * ratio
    }

    // 始终添加 max-width: 100% 确保响应式
    let newStyle = 'max-width: 100%; height: auto; display: block;'
    if (width > 0) {
      newStyle = `width: ${Math.round(width)}px; max-width: 100%; height: auto; display: block;`
    }

    return `<img${attrs}style="${newStyle}"`
  })

  // 处理没有 style 属性的图片 - 确保所有图片都有响应式样式
  html = html.replace(
    /<img(?![^>]*style=)([^>]*)>/gi,
    '<img$1 style="max-width: 100%; height: auto; display: block;">'
  )

  // 处理 width/height 属性的图片（Word 经常使用这种方式）
  html = html.replace(
    /<img([^>]*)\s+width\s*=\s*["']?(\d+)["']?([^>]*)\s+height\s*=\s*["']?(\d+)["']?([^>]*)>/gi,
    (match, before, w, mid, h, after) => {
      const imgWidth = parseInt(w)
      const imgHeight = parseInt(h)
      let finalWidth = imgWidth
      let finalHeight = imgHeight

      if (imgWidth > MAX_IMAGE_WIDTH) {
        const ratio = imgHeight / imgWidth
        finalWidth = MAX_IMAGE_WIDTH
        finalHeight = Math.round(finalWidth * ratio)
      }

      // 移除 width/height 属性，使用 style 代替
      const cleanBefore = before
        .replace(/width\s*=\s*["']?\d+["']?/gi, '')
        .replace(/height\s*=\s*["']?\d+["']?/gi, '')
      const cleanMid = mid
        .replace(/width\s*=\s*["']?\d+["']?/gi, '')
        .replace(/height\s*=\s*["']?\d+["']?/gi, '')
      const cleanAfter = after
        .replace(/width\s*=\s*["']?\d+["']?/gi, '')
        .replace(/height\s*=\s*["']?\d+["']?/gi, '')

      return `<img${cleanBefore}${cleanMid}${cleanAfter} style="width: ${finalWidth}px; max-width: 100%; height: auto; display: block;">`
    }
  )

  // 处理表格样式 - 防止溢出
  // 1. 包装表格在一个可滚动的容器中，并设置表格自适应宽度
  html = html.replace(/<table([^>]*)>/gi, (match, attrs) => {
    // 移除原有的 width 样式，使用 max-width: 100% 防止溢出
    let cleanAttrs = attrs.replace(/width\s*=\s*["'][^"']*["']/gi, '')
    cleanAttrs = cleanAttrs.replace(
      /style\s*=\s*["'][^"']*width[^"']*["']/gi,
      (styleMatch: string) => {
        return styleMatch.replace(/width:\s*[^;]+;?/gi, '')
      }
    )
    return `<table${cleanAttrs} style="border-collapse: collapse; width: 100%; max-width: 100%; table-layout: auto;">`
  })

  // 2. 处理表格单元格样式
  html = html.replace(/<td([^>]*)>/gi, (match, attrs) => {
    // 移除固定宽度，让单元格自适应
    let cleanAttrs = attrs.replace(/width\s*=\s*["'][^"']*["']/gi, '')
    if (cleanAttrs.includes('style=')) {
      return `<td${cleanAttrs.replace(/style="([^"]*)"/i, 'style="$1; border: 1px solid #ddd; padding: 8px; word-wrap: break-word; overflow-wrap: break-word;"')}>`
    }
    return `<td${cleanAttrs} style="border: 1px solid #ddd; padding: 8px; word-wrap: break-word; overflow-wrap: break-word;">`
  })
  html = html.replace(/<th([^>]*)>/gi, (match, attrs) => {
    let cleanAttrs = attrs.replace(/width\s*=\s*["'][^"']*["']/gi, '')
    if (cleanAttrs.includes('style=')) {
      return `<th${cleanAttrs.replace(/style="([^"]*)"/i, 'style="$1; border: 1px solid #ddd; padding: 8px; background: #f5f5f5; font-weight: bold; word-wrap: break-word; overflow-wrap: break-word;"')}>`
    }
    return `<th${cleanAttrs} style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5; font-weight: bold; word-wrap: break-word; overflow-wrap: break-word;">`
  })

  // 保持文本对齐
  html = html.replace(/text-align:\s*(left|center|right|justify)/gi, 'text-align: $1')

  // 保持缩进（转换为 padding-left）
  html = html.replace(/text-indent:\s*([^;]+)/gi, 'text-indent: $1')

  // 保持行高
  html = html.replace(/line-height:\s*([^;]+)/gi, 'line-height: $1')

  // 处理列表缩进
  html = html.replace(
    /<p[^>]*style="[^"]*margin-left:\s*(\d+)([^;]*)[^"]*"[^>]*>\s*[-•●○]\s*/gi,
    '<li style="margin-left: $1$2">'
  )

  // === 特殊处理：将 div/p 上的文本样式转换为 span 包装 ===
  // Tiptap 只能识别 span 标签上的 TextStyle（color, font-size, font-family）
  html = convertBlockStylesToInline(html)

  // 最终安全检查：如果处理后内容太短，恢复原始内容
  const finalHtml = html.trim()
  if (finalHtml.length < originalLength * 0.1 && originalLength > 100) {
    console.warn('cleanWordHtml: 处理后内容过短，恢复原始内容')
    return originalHtml
  }

  return finalHtml
}

/**
 * 将块级元素上的文本样式（color, font-size, font-family, font-weight）转换为内联 span
 * Tiptap 只能识别 mark 级别（span）的 TextStyle，不能识别 block 级别的
 */
const convertBlockStylesToInline = (html: string): string => {
  try {
    // 使用 DOM 解析器更可靠地处理 HTML
    const parser = new DOMParser()
    const doc = parser.parseFromString(`<div id="root">${html}</div>`, 'text/html')
    const root = doc.getElementById('root')

    if (!root) return html

    // 处理所有块级元素（包括段落、div 和标题）
    const blockElements = root.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6')

    blockElements.forEach((element) => {
      const style = element.getAttribute('style')
      if (!style) return

      // 提取文本相关样式
      const textStyles: string[] = []
      const blockStyles: string[] = []

      // 解析样式
      style.split(';').forEach((s) => {
        const trimmed = s.trim()
        if (!trimmed) return

        // 文本样式（需要转移到 span）
        if (
          trimmed.match(/^color:/i) ||
          trimmed.match(/^font-size:/i) ||
          trimmed.match(/^font-family:/i) ||
          trimmed.match(/^font-weight:/i)
        ) {
          textStyles.push(trimmed)
        } else {
          blockStyles.push(trimmed)
        }
      })

      // 如果有文本样式需要转移
      if (textStyles.length > 0) {
        // 更新块级元素的样式（只保留非文本样式）
        if (blockStyles.length > 0) {
          element.setAttribute('style', blockStyles.join('; '))
        } else {
          element.removeAttribute('style')
        }

        // 如果内容不为空，用 span 包装
        const innerHTML = element.innerHTML.trim()
        if (innerHTML && innerHTML !== '<br>') {
          // 检查内容是否已经被 span 完全包装
          const wrappedMatch = innerHTML.match(/^<span([^>]*)>([\s\S]*)<\/span>$/i)
          if (wrappedMatch) {
            // 已有 span 包装，将样式合并到现有 span
            const existingAttrs = wrappedMatch[1]
            const innerContent = wrappedMatch[2]
            const styleMatch = existingAttrs.match(/style="([^"]*)"/i)
            if (styleMatch) {
              // 合并样式
              const existingStyle = styleMatch[1]
              const newStyle = textStyles.join('; ') + '; ' + existingStyle
              element.innerHTML = `<span style="${newStyle}">${innerContent}</span>`
            } else {
              // 添加样式
              element.innerHTML = `<span style="${textStyles.join('; ')}"${existingAttrs}>${innerContent}</span>`
            }
          } else {
            // 用新的 span 包装内容
            element.innerHTML = `<span style="${textStyles.join('; ')}">${innerHTML}</span>`
          }
        }
      }
    })

    return root.innerHTML
  } catch (e) {
    console.warn('convertBlockStylesToInline 处理失败:', e)
    return html // 出错时返回原始内容
  }
}

/**
 * 为 Tiptap 预处理 HTML，确保样式格式正确
 * 将 pt 单位转换为 px，确保颜色格式正确
 * 注意：此函数不再调用 convertBlockStylesToInline，因为 cleanWordHtml 已经处理过
 */
const preprocessHtmlForTiptap = (html: string): string => {
  try {
    // 1. 将 pt 单位转换为 px (1pt ≈ 1.33px)
    html = html.replace(/font-size:\s*(\d+(?:\.\d+)?)\s*pt/gi, (_, size) => {
      const pxSize = Math.round(parseFloat(size) * 1.33)
      return `font-size: ${pxSize}px`
    })

    // 2. 确保颜色格式正确（添加 # 前缀如果缺失）
    html = html.replace(/color:\s*([A-Fa-f0-9]{6})([^A-Fa-f0-9])/gi, 'color: #$1$2')
    html = html.replace(/color:\s*([A-Fa-f0-9]{3})([^A-Fa-f0-9])/gi, 'color: #$1$2')

    // 3. 转换 RGB 颜色为十六进制
    html = html.replace(/color:\s*rgb\((\d+),\s*(\d+),\s*(\d+)\)/gi, (_, r, g, b) => {
      const hex =
        '#' +
        [r, g, b]
          .map((x) => {
            const h = parseInt(x).toString(16)
            return h.length === 1 ? '0' + h : h
          })
          .join('')
      return `color: ${hex}`
    })

    // 4. 处理红色横线（红头文件特有）- 作为补充处理
    // 将带有红色边框的元素转换为带有 data-line-color 属性的 hr
    html = html.replace(
      /<(p|div)[^>]*style="[^"]*border[^"]*(?:red|#[fF]{2}0{4}|#[fF]00|rgb\s*\(\s*255\s*,\s*0\s*,\s*0\s*\))[^"]*"[^>]*>\s*<\/(p|div)>/gi,
      '<hr class="red-line" data-line-color="red">'
    )

    // 处理只有 border-bottom 或 border-top 的红色横线
    html = html.replace(
      /<(p|div)[^>]*style="[^"]*(border-(?:bottom|top)[^;]*(?:red|#[fF]{2}0{4}|#[fF]00))[^"]*"[^>]*>(\s*|&nbsp;)*<\/(p|div)>/gi,
      '<hr class="red-line" data-line-color="red">'
    )

    // 注意：不再重复调用 convertBlockStylesToInline，因为 cleanWordHtml 已经处理过

    return html
  } catch (e) {
    console.warn('preprocessHtmlForTiptap 处理失败:', e)
    return html
  }
}

// 确认导入 Word
const confirmWordImport = async () => {
  if (!editor.value || !wordImportPreview.value) {
    ElMessage.warning('没有可导入的内容')
    return
  }

  try {
    // 确保导入的内容至少包含一个段落
    let content = wordImportPreview.value.trim()
    if (!content) {
      ElMessage.warning('导入内容为空')
      return
    }

    console.log('原始预览内容长度:', content.length)

    // 清理开头的空段落和空白 - 解决"总是空出一行"的问题
    // 但要小心不要删除所有内容
    const beforeClean = content
    content = content.replace(/^(\s*<p[^>]*>\s*(<br\s*\/?>)?\s*<\/p>\s*)+/gi, '')
    content = content.replace(/^\s+/, '')

    // 如果清理后内容为空，恢复原始内容
    if (!content.trim()) {
      console.warn('清理后内容为空，恢复原始内容')
      content = beforeClean
    }

    // 如果内容不是以块级元素开始，包装在段落中
    if (!content.match(/^<(p|h[1-6]|ul|ol|blockquote|pre|table|div|span)/i)) {
      content = `<p>${content}</p>`
    }

    // 确保内容末尾有一个空段落（Tiptap 需要）
    if (!content.match(/<p[^>]*>\s*(<br\s*\/?>)?\s*<\/p>\s*$/i)) {
      content += '<p></p>'
    }

    // 预处理 HTML，确保样式格式正确且能被 Tiptap 识别
    content = preprocessHtmlForTiptap(content)

    console.log('处理后内容长度:', content.length)
    console.log('内容前100字符:', content.substring(0, 100))

    // 使用 setContent 设置内容，emitUpdate=false 避免触发不必要的更新
    try {
      // 先清空编辑器
      editor.value.commands.clearContent(false)
      await nextTick()

      // 设置新内容
      editor.value.commands.setContent(content, false, {
        preserveWhitespace: 'full'
      })
      await nextTick()

      // 等待 DOM 更新
      await new Promise((resolve) => setTimeout(resolve, 100))

      // 安全地设置光标位置到文档开始
      try {
        const { doc } = editor.value.state
        if (doc.content.size > 0) {
          // 找到第一个可以放置光标的位置
          const firstPos = doc.resolve(1)
          if (firstPos) {
            editor.value.commands.setTextSelection(1)
          }
        }
      } catch (focusErr) {
        // 忽略光标设置错误
        console.log('光标设置忽略:', focusErr)
      }
    } catch (setContentError) {
      console.error('setContent 失败:', setContentError)

      // 备用方案：使用 insertContent
      try {
        editor.value.commands.clearContent(false)
        await nextTick()
        editor.value.commands.insertContent(content)
        await nextTick()
      } catch (insertError) {
        console.error('insertContent 也失败:', insertError)
        throw insertError
      }
    }

    // 验证内容是否成功设置
    await new Promise((resolve) => setTimeout(resolve, 50))
    const finalContent = editor.value.getHTML()
    console.log('最终编辑器内容长度:', finalContent.length)

    if (finalContent.length < 30) {
      console.error('内容可能未成功导入，当前内容:', finalContent)
      ElMessage.warning('内容可能未完全导入，请检查编辑器')
    } else {
      ElMessage.success('Word 文档已成功导入')
    }

    wordImportDialogVisible.value = false
    wordImportPreview.value = ''
    wordImportFile.value = null
    wordArrayBuffer.value = null
  } catch (error) {
    console.error('Word导入失败:', error)
    ElMessage.error('导入失败: ' + (error as Error).message)
  }
}

// 清除 Word 文件选择
const clearWordImport = () => {
  wordImportFile.value = null
  wordImportPreview.value = ''
  wordArrayBuffer.value = null
  importProgress.value = 0
  importProgressText.value = ''
}

// 取消导入
const cancelWordImport = () => {
  wordImportDialogVisible.value = false
  wordImportPreview.value = ''
  wordImportFile.value = null
  wordArrayBuffer.value = null
  importProgress.value = 0
  importProgressText.value = ''
}

// 查找替换
const openFindReplace = () => {
  findReplaceVisible.value = true
}

const findNext = () => {
  if (!findText.value || !editor.value) return

  // 简单的查找实现
  const content = editor.value.getText()
  const searchText = matchCase.value ? findText.value : findText.value.toLowerCase()
  const searchIn = matchCase.value ? content : content.toLowerCase()

  const matches = []
  let index = searchIn.indexOf(searchText)
  while (index !== -1) {
    matches.push(index)
    index = searchIn.indexOf(searchText, index + 1)
  }

  findResultCount.value = matches.length
  if (matches.length === 0) {
    ElMessage.warning('未找到匹配内容')
  }
}

const replaceOne = () => {
  if (!findText.value || !editor.value) return
  ElMessage.info('替换功能需要更复杂的实现')
}

const replaceAll = () => {
  if (!findText.value || !editor.value) return
  const content = editor.value.getHTML()
  const regex = new RegExp(findText.value, matchCase.value ? 'g' : 'gi')
  const newContent = content.replace(regex, replaceText.value)
  editor.value.chain().focus().setContent(newContent).run()
  ElMessage.success('替换完成')
}

// 提取文档标题
const extractDocumentTitle = (html: string): string => {
  // 创建一个临时 DOM 元素来解析 HTML
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = html

  // 按优先级查找标题：h1 > h2 > h3 > h4 > h5 > h6
  for (let i = 1; i <= 6; i++) {
    const heading = tempDiv.querySelector(`h${i}`)
    if (heading && heading.textContent?.trim()) {
      return heading.textContent.trim()
    }
  }

  // 如果没有找到标题，尝试获取第一段文本（限制长度）
  const firstParagraph = tempDiv.querySelector('p')
  if (firstParagraph && firstParagraph.textContent?.trim()) {
    const text = firstParagraph.textContent.trim()
    return text.length > 30 ? text.substring(0, 30) + '...' : text
  }

  return '文档预览'
}

// 文档预览
const previewDocument = () => {
  if (!editor.value) return

  const html = editor.value.getHTML()
  previewContent.value = html
  documentTitle.value = extractDocumentTitle(html)
  previewZoom.value = 100
  documentPreviewVisible.value = true
}

// 关闭文档预览
const closeDocumentPreview = () => {
  documentPreviewVisible.value = false
  previewContent.value = ''
}

// 切换预览侧边栏
const togglePreviewSidebar = () => {
  previewSidebarVisible.value = !previewSidebarVisible.value
}

// 切换全屏
const togglePreviewFullscreen = () => {
  if (document.fullscreenElement) {
    document.exitFullscreen()
  } else {
    document.documentElement.requestFullscreen()
  }
}

// 缩小
const zoomOut = () => {
  if (previewZoom.value > 50) {
    previewZoom.value -= 10
  }
}

// 放大
const zoomIn = () => {
  if (previewZoom.value < 200) {
    previewZoom.value += 10
  }
}

// 适应宽度
const fitToWidth = () => {
  previewZoom.value = 100
}

// 标题样式展开/收起
const isHeadingExpanded = ref(false)
const toggleHeadingExpand = () => {
  isHeadingExpanded.value = !isHeadingExpanded.value
}

// 打印文档
const printDocument = () => {
  if (!editor.value) return

  const content = editor.value.getHTML()
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    ElMessage.error('无法打开打印窗口')
    return
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>打印文档</title>
      <style>
        @media print { body { margin: 1cm; } }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        h1 { font-size: 2em; }
        h2 { font-size: 1.5em; }
        h3 { font-size: 1.25em; }
        p { line-height: 1.8; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; }
      </style>
    </head>
    <body>${content}</body>
    </html>
  `)
  printWindow.document.close()
  printWindow.onload = () => {
    printWindow.print()
  }
}
</script>

<style lang="scss" scoped>
.start-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  padding: 8px 12px;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: #e0e0e0;
  margin: 0 8px;
}

.font-select {
  width: 100px;
}

.size-select {
  width: 80px;
}

:deep(.el-select) {
  .el-input__wrapper {
    box-shadow: none;
    border: 1px solid #e0e0e0;
    border-radius: 4px;

    &:hover {
      border-color: #1a73e8;
    }
  }
}

.toolbar-btn,
.toolbar-btn-large {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: #333;
  transition: all 0.15s ease;

  &:hover {
    background: #e8f0fe;
    color: #1a73e8;
  }

  &.active {
    background: #d3e3fd;
    color: #1a73e8;
  }
}

.toolbar-btn {
  min-width: 28px;
  height: 28px;
  padding: 0 6px;

  .btn-icon {
    font-size: 16px;
  }

  .dropdown-arrow {
    font-size: 10px;
    margin-left: 2px;
  }
}

.toolbar-btn-large {
  flex-direction: column;
  padding: 6px 12px;
  gap: 2px;

  .btn-icon-large {
    font-size: 22px;
  }

  .btn-text {
    font-size: 11px;
  }
}

.heading-group {
  position: relative;
  width: 292px;
  height: 66px;
  z-index: 5; // 确保不被前面的元素遮挡

  .heading-panel {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 4px;
    background: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    transition: all 0.2s ease;
    max-height: 60px;
    overflow: hidden;

    &.expanded {
      max-height: 140px; // 足够容纳两行
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      z-index: 100;
    }
  }

  .heading-row {
    display: flex;
    gap: 4px;
    align-items: stretch;
  }

  .heading-row .heading-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 60px;
    height: 50px;
    border: 1px solid #e8e8e8;
    border-radius: 6px;
    background: #fff;
    cursor: pointer;
    transition: all 0.15s ease;
    &:hover {
      border-color: #1a73e8;
      background: #f0f7ff;
    }

    &.active {
      background: #d3e3fd;
      border-color: #1a73e8;
    }

    .heading-title {
      font-size: 14px;
      font-weight: 600;
      color: #333;
      line-height: 1.4;
      height: 50%;

      &.h1 {
        font-size: 20px;
        font-weight: 700;
      }

      &.h2 {
        font-size: 18px;
        font-weight: 600;
      }

      &.h3 {
        font-size: 16px;
        font-weight: 600;
      }

      &.h4 {
        font-size: 14px;
        font-weight: 600;
      }

      &.h5 {
        font-size: 12px;
        font-weight: 600;
      }

      &.h6 {
        font-size: 10px;
        font-weight: 600;
      }
    }

    .heading-label {
      font-size: 10px;
      color: #999;
    }
  }

  .heading-scroll {
    display: flex;
    flex-direction: column;
    justify-content: center;
    margin-left: 2px;

    .scroll-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 24px;
      border: none;
      background: transparent;
      cursor: pointer;
      color: #999;
      border-radius: 4px;

      &:hover {
        background: #f0f0f0;
        color: #333;
      }

      :deep(svg) {
        width: 16px;
        height: 16px;
      }
    }
  }
}

.line-height-menu {
  .menu-item {
    padding: 8px 12px;
    cursor: pointer;
    border-radius: 4px;

    &:hover {
      background: #f5f5f5;
    }

    &.active {
      background: #e8f0fe;
      color: #1a73e8;
    }
  }
}

.find-replace-content {
  .find-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;

    .label {
      width: 50px;
      flex-shrink: 0;
    }

    .el-input {
      flex: 1;
    }
  }

  .find-options {
    display: flex;
    gap: 16px;
    margin-bottom: 12px;
  }

  .find-result {
    color: #666;
    font-size: 13px;
  }
}

// Word 导入样式
.word-import-content {
  .upload-area {
    .word-uploader {
      width: 100%;

      :deep(.el-upload-dragger) {
        padding: 40px 20px;
        border: 2px dashed #d9d9d9;
        border-radius: 8px;
        transition: all 0.2s ease;

        &:hover {
          border-color: #1a73e8;
        }
      }
    }

    .upload-icon {
      font-size: 64px;
      color: #4285f4;
      margin-bottom: 16px;
    }

    .upload-text {
      p {
        margin: 0;
        color: #333;
        font-size: 14px;

        em {
          color: #1a73e8;
          font-style: normal;
          cursor: pointer;
        }
      }

      .upload-hint {
        margin-top: 8px;
        color: #999;
        font-size: 12px;
      }
    }
  }

  .import-options {
    padding: 16px;
    background: #f5f7fa;
    border-radius: 8px;
    margin-bottom: 16px;

    .file-info {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e0e0e0;

      .file-icon {
        font-size: 24px;
        color: #4285f4;
      }

      .file-name {
        flex: 1;
        font-size: 14px;
        font-weight: 500;
        color: #333;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .options-row {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }
  }

  .preview-area {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;

    .preview-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: #fafafa;
      border-bottom: 1px solid #e0e0e0;
      font-size: 13px;
      color: #666;
    }

    .preview-content {
      max-height: 460px;
      overflow-y: auto;
      padding: 16px;
      font-size: 14px;
      line-height: 1.6;

      :deep(h1) {
        font-size: 1.5em;
        margin: 0.5em 0;
      }
      :deep(h2) {
        font-size: 1.25em;
        margin: 0.5em 0;
      }
      :deep(h3) {
        font-size: 1.1em;
        margin: 0.5em 0;
      }
      :deep(p) {
        margin: 0.5em 0;
      }
      // 确保段落和 span 能正确显示自定义样式
      :deep(p[style]),
      :deep(span[style]) {
        // 允许自定义颜色和字号覆盖默认样式
        all: revert;
        margin: 0.5em 0;
        display: inline;
      }
      :deep(p[style]) {
        display: block;
      }
      :deep(table) {
        border-collapse: collapse;
        width: 100%;
        margin: 1em 0;
      }
      :deep(th),
      :deep(td) {
        border: 1px solid #ddd;
        padding: 8px;
      }
      :deep(img) {
        max-width: 100%;
        height: auto;
      }
    }
  }

  .loading-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    color: #666;

    .loading-icon {
      font-size: 48px;
      color: #1a73e8;
      animation: spin 1s linear infinite;
      margin-bottom: 16px;
    }

    p {
      margin: 0;
      font-size: 14px;
    }
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

// 导入进度条
.import-progress {
  width: 200px;
  margin-top: 12px;
}

// 文档预览对话框样式
:global(.document-preview-dialog) {
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

.page-content {
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
