<template>
  <div class="export-toolbar">
    <!-- 预览 HTML -->
    <div class="toolbar-group">
      <el-tooltip content="HTML 预览" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" @click="previewHtml">
          <Icon icon="mdi:language-html5" class="btn-icon-large" />
          <span class="btn-text">HTML 预览</span>
        </button>
      </el-tooltip>
    </div>

    <!-- 导出 HTML -->
    <div class="toolbar-group">
      <el-tooltip content="导出 HTML" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" @click="exportHtml">
          <Icon icon="mdi:file-code-outline" class="btn-icon-large" />
          <span class="btn-text">导出 HTML</span>
        </button>
      </el-tooltip>
    </div>

    <!-- 导出 Word -->
    <div class="toolbar-group">
      <el-tooltip content="导出 Word" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" @click="exportWord">
          <Icon icon="mdi:file-word-outline" class="btn-icon-large" />
          <span class="btn-text">导出 Word</span>
        </button>
      </el-tooltip>
    </div>

    <div class="toolbar-divider"></div>

    <!-- 导出 PDF -->
    <div class="toolbar-group">
      <el-tooltip content="导出 PDF" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" @click="exportPdf">
          <Icon icon="mdi:file-pdf-box" class="btn-icon-large" />
          <span class="btn-text">导出 PDF</span>
        </button>
      </el-tooltip>
    </div>

    <!-- 导出纯文本 -->
    <div class="toolbar-group">
      <el-tooltip content="导出纯文本" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" @click="exportText">
          <Icon icon="mdi:file-document-outline" class="btn-icon-large" />
          <span class="btn-text">导出纯文本</span>
        </button>
      </el-tooltip>
    </div>

    <div class="toolbar-divider"></div>

    <!-- 打印 -->
    <div class="toolbar-group">
      <el-tooltip content="打印" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" @click="printDocument">
          <Icon icon="mdi:printer-outline" class="btn-icon-large" />
          <span class="btn-text">打印</span>
        </button>
      </el-tooltip>
    </div>

    <!-- 打印预览 -->
    <div class="toolbar-group">
      <el-tooltip content="打印预览" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" @click="printPreview">
          <Icon icon="mdi:printer-eye" class="btn-icon-large" />
          <span class="btn-text">打印预览</span>
        </button>
      </el-tooltip>
    </div>

    <div class="toolbar-divider"></div>

    <!-- 分享 -->
    <div class="toolbar-group">
      <el-popover placement="bottom" :width="200" trigger="click">
        <template #reference>
          <span>
            <el-tooltip content="分享文档" placement="bottom" :show-after="500">
              <button class="toolbar-btn-large">
                <Icon icon="mdi:share-variant-outline" class="btn-icon-large" />
                <span class="btn-text">分享</span>
              </button>
            </el-tooltip>
          </span>
        </template>
        <div class="share-panel">
          <div class="share-option" @click="copyShareLink">
            <Icon icon="mdi:link-variant" />
            <span>复制链接</span>
          </div>
          <div class="share-option" @click="shareToEmail">
            <Icon icon="mdi:email-outline" />
            <span>发送邮件</span>
          </div>
          <div class="share-option" @click="generateQrCode">
            <Icon icon="mdi:qrcode" />
            <span>生成二维码</span>
          </div>
        </div>
      </el-popover>
    </div>

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
        <div v-if="previewMode === 'preview'" class="html-preview" v-html="previewContent"></div>
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
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck - 忽略 Tiptap 扩展类型问题
import { ref, computed } from 'vue'
import { Icon } from '@/components/Icon'
import { ElMessage } from 'element-plus'
import { useEditor } from './useEditor'
import { docModelToDocx, normalizeHtmlThroughDocModel, parseHtmlToDocModel } from '../../utils/wordParser'
import { restoreBlobImagesFromOriginAsync } from '@/views/utils/fileUtils'
import { downloadBlob, wrapInExportHtml } from '@/views/utils/documentExport'

// 获取编辑器实例
const editor = useEditor()

// 对话框状态
const htmlPreviewVisible = ref(false)
const previewMode = ref<'preview' | 'source'>('preview')
const previewContent = ref('')

// 格式化 HTML
const formattedHtml = computed(() => {
  if (!previewContent.value) return ''
  return previewContent.value
    .replace(/></g, '>\n<')
    .replace(/(<\/?[^>]+>)/g, '\n$1')
    .split('\n')
    .filter((line) => line.trim())
    .join('\n')
})

// 生成完整 HTML（异步：还原 blob 图片 + DocModel 归一化）
const generateFullHtml = async (): Promise<string> => {
  if (!editor.value) return ''

  const raw = editor.value.getHTML()
  const restored = await restoreBlobImagesFromOriginAsync(raw)
  const content = normalizeHtmlThroughDocModel(restored, {
    source: 'html',
    method: 'tiptap-html'
  })
  return wrapInExportHtml(content, '文档')
}

// HTML 预览
const previewHtml = async () => {
  if (!editor.value) {
    ElMessage.warning('编辑器未就绪')
    return
  }
  const content = editor.value.getHTML()
  const restored = await restoreBlobImagesFromOriginAsync(content)
  previewContent.value = normalizeHtmlThroughDocModel(restored, {
    source: 'html',
    method: 'tiptap-html'
  })
  previewMode.value = 'preview'
  htmlPreviewVisible.value = true
}

// 导出 HTML
const exportHtml = async () => {
  const html = await generateFullHtml()
  downloadFile(html, '文档.html', 'text/html')
  ElMessage.success('HTML 已导出')
}

// 导出 Word (使用 HTML 格式)
const exportWord = async () => {
  if (!editor.value) return

  try {
    const content = editor.value.getHTML()
    const restored = await restoreBlobImagesFromOriginAsync(content)
    const normalizedHtml = normalizeHtmlThroughDocModel(restored, {
      source: 'html',
      method: 'tiptap-html'
    })
    const docModel = parseHtmlToDocModel(normalizedHtml, {
      source: 'html',
      method: 'tiptap-html'
    })
    const blob = await docModelToDocx(docModel, '文档')
    downloadBlob(blob, '文档.docx')
    ElMessage.success('Word 文档已导出')
  } catch (error) {
    console.error('导出 Word 失败:', error)
    ElMessage.error('导出失败')
  }
}

// 导出 PDF
const exportPdf = async () => {
  if (!editor.value) return

  const html = await generateFullHtml()
  const printWindow = window.open('', '_blank')

  if (!printWindow) {
    ElMessage.error('无法打开打印窗口，请检查浏览器是否阻止弹窗')
    return
  }

  printWindow.document.write(html)
  printWindow.document.close()

  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print()
      printWindow.onafterprint = () => printWindow.close()
    }, 250)
  }

  ElMessage.success('请在打印对话框中选择"另存为 PDF"')
}

// 导出纯文本
const exportText = () => {
  if (!editor.value) return

  const text = editor.value.getText()
  downloadFile(text, '文档.txt', 'text/plain')
  ElMessage.success('纯文本已导出')
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
  downloadFile(html, '文档.html', 'text/html')
  ElMessage.success('HTML 已下载')
}

// 打印文档
const printDocument = async () => {
  if (!editor.value) return

  const html = await generateFullHtml()
  const printWindow = window.open('', '_blank')

  if (!printWindow) {
    ElMessage.error('无法打开打印窗口')
    return
  }

  printWindow.document.write(html)
  printWindow.document.close()

  printWindow.onload = () => {
    printWindow.print()
  }
}

// 打印预览
const printPreview = async () => {
  if (!editor.value) return

  const html = await generateFullHtml()
  const previewWindow = window.open('', '_blank')

  if (!previewWindow) {
    ElMessage.error('无法打开预览窗口')
    return
  }

  previewWindow.document.write(html)
  previewWindow.document.close()
}

// 复制分享链接
const copyShareLink = async () => {
  try {
    await navigator.clipboard.writeText(window.location.href)
    ElMessage.success('链接已复制')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

// 发送邮件
const shareToEmail = () => {
  const subject = encodeURIComponent('文档分享')
  const body = encodeURIComponent(`请查看文档：${window.location.href}`)
  window.open(`mailto:?subject=${subject}&body=${body}`)
}

// 生成二维码（简单提示）
const generateQrCode = () => {
  ElMessage.info('二维码功能开发中')
}

// 下载文件工具函数
const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
</script>

<style lang="scss" scoped>
.export-toolbar {
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

.share-panel {
  .share-option {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.15s ease;

    &:hover {
      background: #f5f5f5;
    }

    span {
      font-size: 13px;
    }
  }
}

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
  }

  :deep(pre) {
    background: #1f2937;
    color: #f9fafb;
    padding: 1em;
    border-radius: 8px;
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
  }
}

.html-source {
  background: #1f2937;
  padding: 16px;

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

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
