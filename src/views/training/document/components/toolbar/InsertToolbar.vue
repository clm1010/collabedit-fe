<template>
  <div class="insert-toolbar">
    <!-- 链接 -->
    <div class="toolbar-group">
      <el-tooltip content="链接" placement="bottom" :show-after="500">
        <button ref="linkBtnRef" class="toolbar-btn-large" @click="insertLink">
          <Icon icon="mdi:link-variant" class="btn-icon-large" />
          <span class="btn-text">链接</span>
        </button>
      </el-tooltip>
    </div>

    <!-- 媒体 -->
    <div class="toolbar-group">
      <el-popover placement="bottom" :width="180" trigger="click" :show-arrow="false">
        <template #reference>
          <span>
            <el-tooltip content="图片" placement="bottom" :show-after="500">
              <button class="toolbar-btn-large">
                <Icon icon="mdi:image-outline" class="btn-icon-large" />
                <span class="btn-text">图片</span>
              </button>
            </el-tooltip>
          </span>
        </template>
        <div class="image-menu">
          <div class="image-menu-item" @click="insertBlockImage">
            <div class="menu-item-title">图片</div>
            <div class="menu-item-hint">在节点上插入图片</div>
          </div>
          <div class="image-menu-item" @click="insertInlineImage">
            <div class="menu-item-title">行内图片</div>
            <div class="menu-item-hint">在段落内插入图片</div>
          </div>
        </div>
      </el-popover>
      <el-tooltip content="视频" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" @click="insertVideo">
          <Icon icon="mdi:video-outline" class="btn-icon-large" />
          <span class="btn-text">视频</span>
        </button>
      </el-tooltip>
      <el-tooltip content="代码块" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" @click="insertCodeBlock">
          <Icon icon="mdi:code-braces" class="btn-icon-large" />
          <span class="btn-text">代码块</span>
        </button>
      </el-tooltip>
      <el-tooltip content="文件" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" @click="insertFile">
          <Icon icon="mdi:file-document-outline" class="btn-icon-large" />
          <span class="btn-text">文件</span>
        </button>
      </el-tooltip>
    </div>

    <div class="toolbar-divider"></div>

    <!-- 特殊字符 -->
    <div class="toolbar-group">
      <el-popover placement="bottom" :width="400" trigger="click">
        <template #reference>
          <span>
            <el-tooltip content="特殊字符" placement="bottom" :show-after="500">
              <button class="toolbar-btn-large">
                <Icon icon="mdi:omega" class="btn-icon-large" />
                <span class="btn-text">特殊字符</span>
              </button>
            </el-tooltip>
          </span>
        </template>
        <div class="special-chars-panel">
          <el-tabs v-model="activeCharTab">
            <el-tab-pane
              v-for="(chars, category) in specialCharacters"
              :key="category"
              :label="category"
              :name="category"
            >
              <div class="char-grid">
                <button
                  v-for="char in chars"
                  :key="char"
                  class="char-btn"
                  @click="insertSpecialChar(char)"
                >
                  {{ char }}
                </button>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
      </el-popover>
    </div>

    <!-- 日期 -->
    <div class="toolbar-group">
      <el-popover placement="bottom" :width="320" trigger="click">
        <template #reference>
          <span>
            <el-tooltip content="日期" placement="bottom" :show-after="500">
              <button class="toolbar-btn-large">
                <Icon icon="mdi:calendar-outline" class="btn-icon-large" />
                <span class="btn-text">日期</span>
              </button>
            </el-tooltip>
          </span>
        </template>
        <div class="date-panel">
          <el-date-picker
            v-model="selectedDate"
            type="date"
            placeholder="选择日期"
            style="width: 100%"
          />
          <div class="date-formats">
            <div class="format-label">日期格式:</div>
            <div class="format-options">
              <el-radio-group v-model="dateFormat" size="small">
                <el-radio value="YYYY-MM-DD">{{ formatDate('YYYY-MM-DD') }}</el-radio>
                <el-radio value="YYYY年MM月DD日">{{ formatDate('YYYY年MM月DD日') }}</el-radio>
                <el-radio value="MM/DD/YYYY">{{ formatDate('MM/DD/YYYY') }}</el-radio>
                <el-radio value="YYYY/MM/DD">{{ formatDate('YYYY/MM/DD') }}</el-radio>
              </el-radio-group>
            </div>
          </div>
          <el-button type="primary" class="insert-btn" @click="insertDate">插入日期</el-button>
        </div>
      </el-popover>
    </div>

    <!-- 表情 -->
    <div class="toolbar-group">
      <el-popover placement="bottom" :width="360" trigger="click">
        <template #reference>
          <span>
            <el-tooltip content="表情" placement="bottom" :show-after="500">
              <button class="toolbar-btn-large">
                <Icon icon="mdi:emoticon-outline" class="btn-icon-large" />
                <span class="btn-text">表情</span>
              </button>
            </el-tooltip>
          </span>
        </template>
        <div class="emoji-panel">
          <el-tabs v-model="activeEmojiTab">
            <el-tab-pane
              v-for="(emojis, category) in emojiCategories"
              :key="category"
              :label="category"
              :name="category"
            >
              <div class="emoji-grid">
                <button
                  v-for="emoji in emojis"
                  :key="emoji"
                  class="emoji-btn"
                  @click="insertEmoji(emoji)"
                >
                  {{ emoji }}
                </button>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
      </el-popover>
    </div>

    <!-- 数学公式 -->
    <div class="toolbar-group">
      <el-tooltip content="数学公式" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" @click="insertMath">
          <Icon icon="mdi:function-variant" class="btn-icon-large" />
          <span class="btn-text">数学公式</span>
        </button>
      </el-tooltip>
    </div>

    <div class="toolbar-divider"></div>

    <!-- 标签 -->
    <div class="toolbar-group">
      <el-tooltip content="标签" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" @click="insertTag">
          <Icon icon="mdi:tag-outline" class="btn-icon-large" />
          <span class="btn-text">标签</span>
        </button>
      </el-tooltip>
    </div>

    <!-- 分栏 -->
    <div class="toolbar-group">
      <el-popover placement="bottom" :width="200" trigger="click">
        <template #reference>
          <span>
            <el-tooltip content="分栏" placement="bottom" :show-after="500">
              <button class="toolbar-btn-large">
                <Icon icon="mdi:view-column-outline" class="btn-icon-large" />
                <span class="btn-text">分栏</span>
              </button>
            </el-tooltip>
          </span>
        </template>
        <div class="column-panel">
          <div class="column-options">
            <button
              v-for="cols in [2, 3, 4]"
              :key="cols"
              class="column-btn"
              @click="insertColumns(cols)"
            >
              <div class="column-preview">
                <div v-for="i in cols" :key="i" class="column-bar"></div>
              </div>
              <span>{{ cols }} 栏</span>
            </button>
          </div>
        </div>
      </el-popover>
    </div>

    <!-- 高亮块 -->
    <div class="toolbar-group">
      <el-popover placement="bottom" :width="240" trigger="click">
        <template #reference>
          <span>
            <el-tooltip content="高亮块" placement="bottom" :show-after="500">
              <button class="toolbar-btn-large">
                <Icon icon="mdi:card-text-outline" class="btn-icon-large" />
                <span class="btn-text">高亮块</span>
              </button>
            </el-tooltip>
          </span>
        </template>
        <div class="callout-panel">
          <div class="callout-options">
            <button
              v-for="callout in calloutTypes"
              :key="callout.type"
              class="callout-btn"
              :style="{ backgroundColor: callout.bgColor, borderColor: callout.borderColor }"
              @click="insertCallout(callout)"
            >
              <Icon :icon="callout.icon" :style="{ color: callout.iconColor }" />
              <span>{{ callout.label }}</span>
            </button>
          </div>
        </div>
      </el-popover>
    </div>

    <!-- 提及某人 -->
    <div class="toolbar-group">
      <el-tooltip content="提及某人" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" @click="insertMention">
          <Icon icon="mdi:at" class="btn-icon-large" />
          <span class="btn-text">提及某人</span>
        </button>
      </el-tooltip>
    </div>

    <!-- 书签 -->
    <div class="toolbar-group">
      <el-tooltip content="书签" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" @click="insertBookmark">
          <Icon icon="mdi:bookmark-outline" class="btn-icon-large" />
          <span class="btn-text">书签</span>
        </button>
      </el-tooltip>
    </div>

    <div class="toolbar-divider"></div>

    <!-- 换行符 -->
    <div class="toolbar-group">
      <el-tooltip content="换行符" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" @click="insertLineBreak">
          <Icon icon="mdi:keyboard-return" class="btn-icon-large" />
          <span class="btn-text">换行符</span>
        </button>
      </el-tooltip>
    </div>

    <!-- 分隔线 -->
    <div class="toolbar-group">
      <el-tooltip content="分隔线" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" @click="insertDivider">
          <Icon icon="mdi:minus" class="btn-icon-large" />
          <span class="btn-text">分隔线</span>
        </button>
      </el-tooltip>
    </div>

    <!-- 页面大小 -->
    <div class="toolbar-group">
      <el-popover placement="bottom" :width="200" trigger="click">
        <template #reference>
          <span>
            <el-tooltip content="页面大小" placement="bottom" :show-after="500">
              <button class="toolbar-btn-large">
                <Icon icon="mdi:file-document-multiple-outline" class="btn-icon-large" />
                <span class="btn-text">页面大小</span>
              </button>
            </el-tooltip>
          </span>
        </template>
        <div class="page-size-panel">
          <el-radio-group v-model="pageSize" class="page-size-options">
            <el-radio value="A4">A4 (210mm × 297mm)</el-radio>
            <el-radio value="A3">A3 (297mm × 420mm)</el-radio>
            <el-radio value="Letter">Letter (216mm × 279mm)</el-radio>
            <el-radio value="Legal">Legal (216mm × 356mm)</el-radio>
          </el-radio-group>
        </div>
      </el-popover>
    </div>

    <!-- 文本框 -->
    <div class="toolbar-group">
      <el-tooltip content="文本框" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" @click="insertTextBox">
          <Icon icon="mdi:text-box-outline" class="btn-icon-large" />
          <span class="btn-text">文本框</span>
        </button>
      </el-tooltip>
    </div>

    <div class="toolbar-divider"></div>

    <!-- 模板 -->
    <div class="toolbar-group">
      <el-popover placement="bottom" :width="280" trigger="click">
        <template #reference>
          <span>
            <el-tooltip content="模板" placement="bottom" :show-after="500">
              <button class="toolbar-btn-large">
                <Icon icon="mdi:file-document-edit-outline" class="btn-icon-large" />
                <span class="btn-text">模板</span>
              </button>
            </el-tooltip>
          </span>
        </template>
        <div class="template-panel">
          <div
            v-for="tpl in templateList"
            :key="tpl.id"
            class="template-item"
            @click="applyTemplate(tpl)"
          >
            <div class="template-name">{{ tpl.name }}</div>
            <div class="template-desc">{{ tpl.description }}</div>
          </div>
        </div>
      </el-popover>
    </div>

    <!-- 网页 -->
    <div class="toolbar-group">
      <el-tooltip content="嵌入网页" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" @click="insertWebpage">
          <Icon icon="mdi:web" class="btn-icon-large" />
          <span class="btn-text">网页</span>
        </button>
      </el-tooltip>
    </div>

    <!-- Link Popover 组件 -->
    <LinkPopover
      v-if="editor"
      :editor="editor"
      v-model:visible="linkPopoverVisible"
      :initial-url="linkPopoverUrl"
      :trigger-rect="linkPopoverTriggerRect"
      @apply="handleLinkApply"
      @remove="handleLinkRemove"
    />

    <!-- 图片文件选择 -->
    <input
      ref="imageInput"
      type="file"
      accept="image/*"
      style="display: none"
      @change="handleImageSelect"
    />

    <!-- 视频对话框 -->
    <el-dialog v-model="videoDialogVisible" title="插入视频" width="480px">
      <el-form :model="videoForm" label-width="80px">
        <el-form-item label="视频地址">
          <el-input v-model="videoForm.url" placeholder="请输入视频 URL 或嵌入代码" />
        </el-form-item>
        <el-form-item label="宽度">
          <el-input-number v-model="videoForm.width" :min="200" :max="1200" />
        </el-form-item>
        <el-form-item label="高度">
          <el-input-number v-model="videoForm.height" :min="100" :max="800" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="videoDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmInsertVideo">确定</el-button>
      </template>
    </el-dialog>

    <!-- 数学公式对话框 -->
    <el-dialog v-model="mathDialogVisible" title="插入数学公式" width="560px">
      <div class="math-editor">
        <el-input
          v-model="mathFormula"
          type="textarea"
          :rows="4"
          placeholder="输入 LaTeX 公式，例如: E = mc^2"
        />
        <div class="math-preview" v-if="mathFormula">
          <div class="preview-label">预览：</div>
          <div class="preview-content">{{ mathFormula }}</div>
        </div>
        <div class="math-examples">
          <div class="examples-label">常用公式：</div>
          <div class="examples-list">
            <button @click="mathFormula = 'E = mc^2'">E = mc²</button>
            <button @click="mathFormula = '\\frac{a}{b}'">分数</button>
            <button @click="mathFormula = '\\sqrt{x}'">根号</button>
            <button @click="mathFormula = '\\sum_{i=1}^n'">求和</button>
            <button @click="mathFormula = '\\int_0^\\infty'">积分</button>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="mathDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmInsertMath">插入</el-button>
      </template>
    </el-dialog>

    <!-- 嵌入网页对话框 -->
    <el-dialog v-model="webpageDialogVisible" title="嵌入网页" width="480px">
      <el-form :model="webpageForm" label-width="80px">
        <el-form-item label="网页地址">
          <el-input v-model="webpageForm.url" placeholder="https://" />
        </el-form-item>
        <el-form-item label="宽度">
          <el-input-number v-model="webpageForm.width" :min="200" :max="1200" />
        </el-form-item>
        <el-form-item label="高度">
          <el-input-number v-model="webpageForm.height" :min="100" :max="800" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="webpageDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmInsertWebpage">确定</el-button>
      </template>
    </el-dialog>

    <!-- 文件上传 -->
    <input ref="fileInput" type="file" style="display: none" @change="handleFileUpload" />
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck - 忽略 Tiptap 扩展类型问题
import { ref, reactive } from 'vue'
import { Icon } from '@/components/Icon'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import { specialCharacters, emojiCategories, templateList } from './types'
import { useEditor } from './useEditor'
import LinkPopover from './LinkPopover.vue'

// 获取编辑器实例
const editor = useEditor()

// 特殊字符和表情标签
const activeCharTab = ref('标点符号')
const activeEmojiTab = ref('常用')

// 日期相关
const selectedDate = ref(new Date())
const dateFormat = ref('YYYY-MM-DD')

// 页面大小
const pageSize = ref('A4')

// 高亮块类型
const calloutTypes = [
  {
    type: 'info',
    label: '信息',
    icon: 'mdi:information-outline',
    bgColor: '#e7f3ff',
    borderColor: '#1890ff',
    iconColor: '#1890ff'
  },
  {
    type: 'success',
    label: '成功',
    icon: 'mdi:check-circle-outline',
    bgColor: '#f6ffed',
    borderColor: '#52c41a',
    iconColor: '#52c41a'
  },
  {
    type: 'warning',
    label: '警告',
    icon: 'mdi:alert-outline',
    bgColor: '#fffbe6',
    borderColor: '#faad14',
    iconColor: '#faad14'
  },
  {
    type: 'danger',
    label: '危险',
    icon: 'mdi:close-circle-outline',
    bgColor: '#fff2f0',
    borderColor: '#ff4d4f',
    iconColor: '#ff4d4f'
  }
]

// LinkPopover 相关状态
const linkPopoverVisible = ref(false)
const linkPopoverUrl = ref('')
const linkPopoverTriggerRect = ref<DOMRect | null>(null)
const linkBtnRef = ref<HTMLElement | null>(null)

// 图片选择
const imageInput = ref<HTMLInputElement | null>(null)
const isInlineImage = ref(false)

// 视频对话框
const videoDialogVisible = ref(false)
const videoForm = reactive({
  url: '',
  width: 640,
  height: 360
})

// 数学公式对话框
const mathDialogVisible = ref(false)
const mathFormula = ref('')

// 网页对话框
const webpageDialogVisible = ref(false)
const webpageForm = reactive({
  url: '',
  width: 800,
  height: 450
})

// 文件输入
const fileInput = ref<HTMLInputElement | null>(null)

// 格式化日期
const formatDate = (format: string) => {
  return dayjs(selectedDate.value).format(format)
}

// 插入链接 - 使用 LinkPopover 组件
const insertLink = () => {
  if (!editor.value) return

  // 获取当前链接的 URL（如果有的话）
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
  if (!editor.value || !url) return

  // 检查是否有选中的文本
  const { from, to } = editor.value.state.selection
  const selectedText = editor.value.state.doc.textBetween(from, to)

  if (selectedText) {
    // 有选中文本，直接设置链接
    editor.value.chain().focus().setLink({ href: url }).run()
  } else {
    // 没有选中文本，插入链接文本
    editor.value.chain().focus().insertContent(`<a href="${url}">${url}</a>`).run()
  }
}

// 删除链接
const handleLinkRemove = () => {
  if (!editor.value) return

  editor.value.chain().focus().unsetLink().run()
}

// 插入块级图片
const insertBlockImage = () => {
  isInlineImage.value = false
  imageInput.value?.click()
}

// 插入行内图片
const insertInlineImage = () => {
  isInlineImage.value = true
  imageInput.value?.click()
}

// 处理图片选择
const handleImageSelect = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file || !editor.value) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const src = e.target?.result as string
    if (isInlineImage.value) {
      // 插入行内图片
      editor.value?.chain().focus().setImage({ src }).run()
    } else {
      // 插入块级图片
      editor.value?.chain().focus().setImage({ src }).run()
    }
  }
  reader.readAsDataURL(file)
  // 清空 input 以便可以重复选择同一文件
  ;(event.target as HTMLInputElement).value = ''
}

// 插入视频
const insertVideo = () => {
  videoDialogVisible.value = true
}

const confirmInsertVideo = () => {
  if (!editor.value || !videoForm.url) {
    ElMessage.warning('请输入视频地址')
    return
  }

  // 插入 iframe 作为视频嵌入
  const iframe = `<iframe src="${videoForm.url}" width="${videoForm.width}" height="${videoForm.height}" frameborder="0" allowfullscreen></iframe>`
  editor.value.chain().focus().insertContent(iframe).run()

  videoDialogVisible.value = false
  videoForm.url = ''
}

// 插入代码块
const insertCodeBlock = () => {
  if (!editor.value) return
  editor.value.chain().focus().toggleCodeBlock().run()
}

// 插入文件
const insertFile = () => {
  fileInput.value?.click()
}

const handleFileUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  // 创建文件下载链接
  const reader = new FileReader()
  reader.onload = () => {
    const link = `<a href="#" class="file-attachment" data-filename="${file.name}">📎 ${file.name}</a>`
    editor.value?.chain().focus().insertContent(link).run()
    ElMessage.success('文件已插入')
  }
  reader.readAsDataURL(file)
  ;(event.target as HTMLInputElement).value = ''
}

// 插入特殊字符
const insertSpecialChar = (char: string) => {
  if (!editor.value) return
  editor.value.chain().focus().insertContent(char).run()
}

// 插入日期
const insertDate = () => {
  if (!editor.value) return
  const formattedDate = formatDate(dateFormat.value)
  editor.value.chain().focus().insertContent(formattedDate).run()
}

// 插入表情
const insertEmoji = (emoji: string) => {
  if (!editor.value) return
  editor.value.chain().focus().insertContent(emoji).run()
}

// 插入数学公式
const insertMath = () => {
  mathDialogVisible.value = true
}

const confirmInsertMath = () => {
  if (!editor || !mathFormula.value) {
    ElMessage.warning('请输入公式')
    return
  }

  // 插入公式（实际应用中需要数学公式渲染扩展）
  const formula = `<span class="math-formula" data-formula="${mathFormula.value}">$${mathFormula.value}$</span>`
  editor.value.chain().focus().insertContent(formula).run()

  mathDialogVisible.value = false
  mathFormula.value = ''
}

// 插入标签
const insertTag = () => {
  if (!editor.value) return
  const tag = prompt('请输入标签内容')
  if (tag) {
    editor.value.chain().focus().insertContent(`<span class="inline-tag">#${tag}</span> `).run()
  }
}

// 插入分栏
const insertColumns = (cols: number) => {
  if (!editor.value) return
  const columnWidth = Math.floor(100 / cols)
  let columnsHtml = '<div class="columns-container" style="display: flex; gap: 16px;">'
  for (let i = 0; i < cols; i++) {
    columnsHtml += `<div class="column" style="flex: 1; min-width: 0;"><p>第 ${i + 1} 栏内容</p></div>`
  }
  columnsHtml += '</div>'
  editor.value.chain().focus().insertContent(columnsHtml).run()
}

// 插入高亮块
const insertCallout = (callout: any) => {
  if (!editor.value) return
  const html = `<div class="callout callout-${callout.type}" style="background: ${callout.bgColor}; border-left: 4px solid ${callout.borderColor}; padding: 12px 16px; margin: 8px 0; border-radius: 4px;">
    <p>在此输入内容...</p>
  </div>`
  editor.value.chain().focus().insertContent(html).run()
}

// 插入提及
const insertMention = () => {
  if (!editor.value) return
  const name = prompt('请输入要提及的人名')
  if (name) {
    editor.value
      .chain()
      .focus()
      .insertContent(`<span class="mention" data-mention="${name}">@${name}</span> `)
      .run()
  }
}

// 插入书签
const insertBookmark = () => {
  if (!editor.value) return
  const id = prompt('请输入书签 ID')
  if (id) {
    editor.value
      .chain()
      .focus()
      .insertContent(`<a name="${id}" class="bookmark" id="${id}">🔖</a>`)
      .run()
    ElMessage.success('书签已插入')
  }
}

// 插入换行符
const insertLineBreak = () => {
  if (!editor.value) return
  editor.value.chain().focus().setHardBreak().run()
}

// 插入分隔线
const insertDivider = () => {
  if (!editor.value) return
  editor.value.chain().focus().setHorizontalRule().run()
}

// 插入文本框
const insertTextBox = () => {
  if (!editor.value) return
  const html = `<div class="text-box" style="border: 2px solid #e0e0e0; padding: 16px; margin: 8px 0; border-radius: 8px; background: #fafafa;">
    <p>在此输入文本框内容...</p>
  </div>`
  editor.value.chain().focus().insertContent(html).run()
}

// 应用模板
const applyTemplate = (template: any) => {
  if (!editor.value) return

  let content = ''
  switch (template.id) {
    case 'blank':
      content = '<p></p>'
      break
    case 'report':
      content = `
        <h1>工作报告</h1>
        <h2>一、工作概述</h2>
        <p>请在此描述本阶段的工作概述...</p>
        <h2>二、主要工作内容</h2>
        <p>1. </p>
        <p>2. </p>
        <p>3. </p>
        <h2>三、工作成果</h2>
        <p></p>
        <h2>四、存在问题</h2>
        <p></p>
        <h2>五、下一步计划</h2>
        <p></p>
      `
      break
    case 'meeting':
      content = `
        <h1>会议纪要</h1>
        <p><strong>会议时间：</strong></p>
        <p><strong>会议地点：</strong></p>
        <p><strong>参会人员：</strong></p>
        <p><strong>主持人：</strong></p>
        <hr>
        <h2>会议议题</h2>
        <p></p>
        <h2>讨论内容</h2>
        <p></p>
        <h2>会议决议</h2>
        <p></p>
        <h2>待办事项</h2>
        <table>
          <tr><th>事项</th><th>负责人</th><th>完成时间</th></tr>
          <tr><td></td><td></td><td></td></tr>
        </table>
      `
      break
    case 'contract':
      content = `
        <h1 style="text-align: center;">合同协议书</h1>
        <p>甲方：</p>
        <p>乙方：</p>
        <p>根据《中华人民共和国民法典》及相关法律法规的规定，甲乙双方在平等、自愿、公平、诚信的基础上，就以下事项达成协议：</p>
        <h2>第一条 合同内容</h2>
        <p></p>
        <h2>第二条 合同金额</h2>
        <p></p>
        <h2>第三条 权利与义务</h2>
        <p></p>
        <h2>第四条 违约责任</h2>
        <p></p>
        <h2>第五条 争议解决</h2>
        <p></p>
        <p style="margin-top: 40px;">甲方签章：                    乙方签章：</p>
        <p>日期：                        日期：</p>
      `
      break
    case 'resume':
      content = `
        <h1 style="text-align: center;">个人简历</h1>
        <h2>基本信息</h2>
        <table>
          <tr><td>姓名</td><td></td><td>性别</td><td></td></tr>
          <tr><td>出生日期</td><td></td><td>电话</td><td></td></tr>
          <tr><td>邮箱</td><td></td><td>学历</td><td></td></tr>
        </table>
        <h2>教育背景</h2>
        <p></p>
        <h2>工作经历</h2>
        <p></p>
        <h2>专业技能</h2>
        <p></p>
        <h2>自我评价</h2>
        <p></p>
      `
      break
  }

  editor.value.chain().focus().setContent(content).run()
  ElMessage.success('模板已应用')
}

// 嵌入网页
const insertWebpage = () => {
  webpageDialogVisible.value = true
}

const confirmInsertWebpage = () => {
  if (!editor.value || !webpageForm.url) {
    ElMessage.warning('请输入网页地址')
    return
  }

  const iframe = `<iframe src="${webpageForm.url}" width="${webpageForm.width}" height="${webpageForm.height}" frameborder="0"></iframe>`
  editor.value.chain().focus().insertContent(iframe).run()

  webpageDialogVisible.value = false
  webpageForm.url = ''
}
</script>

<style lang="scss" scoped>
.insert-toolbar {
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

.toolbar-btn-large {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 6px 12px;
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

  .btn-icon-large {
    font-size: 22px;
  }

  .btn-text {
    font-size: 11px;
  }
}

.special-chars-panel,
.emoji-panel {
  max-height: 300px;
  overflow-y: auto;

  .char-grid,
  .emoji-grid {
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    gap: 4px;
  }

  .char-btn,
  .emoji-btn {
    width: 32px;
    height: 32px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    background: #fff;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;

    &:hover {
      background: #e8f0fe;
      border-color: #1a73e8;
    }
  }

  .emoji-btn {
    font-size: 18px;
  }
}

.date-panel {
  .date-formats {
    margin-top: 16px;

    .format-label {
      font-size: 13px;
      color: #666;
      margin-bottom: 8px;
    }

    .format-options {
      :deep(.el-radio) {
        display: block;
        margin-bottom: 8px;
      }
    }
  }

  .insert-btn {
    margin-top: 16px;
    width: 100%;
  }
}

.column-panel {
  .column-options {
    display: flex;
    gap: 12px;
  }

  .column-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 12px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background: #fff;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      border-color: #1a73e8;
      background: #e8f0fe;
    }

    .column-preview {
      display: flex;
      gap: 4px;
      width: 48px;
      height: 32px;

      .column-bar {
        flex: 1;
        background: #d0d0d0;
        border-radius: 2px;
      }
    }

    span {
      font-size: 12px;
      color: #666;
    }
  }
}

.callout-panel {
  .callout-options {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .callout-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    border: 1px solid;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      opacity: 0.9;
      transform: scale(1.02);
    }

    span {
      font-size: 13px;
    }
  }
}

.template-panel {
  .template-item {
    padding: 12px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      border-color: #1a73e8;
      background: #e8f0fe;
    }

    .template-name {
      font-weight: 500;
      margin-bottom: 4px;
    }

    .template-desc {
      font-size: 12px;
      color: #666;
    }
  }
}

.page-size-panel {
  .page-size-options {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
}

.image-menu {
  .image-menu-item {
    padding: 10px 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background: #f0f7ff;
    }

    .menu-item-title {
      font-size: 14px;
      font-weight: 500;
      color: #333;
      margin-bottom: 2px;
    }

    .menu-item-hint {
      font-size: 12px;
      color: #999;
    }
  }
}

.math-editor {
  .math-preview {
    margin-top: 16px;
    padding: 12px;
    background: #f5f5f5;
    border-radius: 8px;

    .preview-label {
      font-size: 12px;
      color: #666;
      margin-bottom: 8px;
    }

    .preview-content {
      font-family: 'Times New Roman', serif;
      font-size: 18px;
    }
  }

  .math-examples {
    margin-top: 16px;

    .examples-label {
      font-size: 12px;
      color: #666;
      margin-bottom: 8px;
    }

    .examples-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;

      button {
        padding: 6px 12px;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        background: #fff;
        cursor: pointer;
        font-size: 13px;

        &:hover {
          border-color: #1a73e8;
          color: #1a73e8;
        }
      }
    }
  }
}
</style>
