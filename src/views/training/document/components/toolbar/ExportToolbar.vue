<template>
  <div class="export-toolbar">
    <div class="toolbar-group">
      <el-tooltip content="HTML 预览" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" @click="previewHtml">
          <Icon icon="mdi:language-html5" class="btn-icon-large" />
          <span class="btn-text">HTML 预览</span>
        </button>
      </el-tooltip>
    </div>

    <div class="toolbar-group">
      <el-tooltip content="导出 HTML" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" @click="exportHtml">
          <Icon icon="mdi:file-code-outline" class="btn-icon-large" />
          <span class="btn-text">导出 HTML</span>
        </button>
      </el-tooltip>
    </div>

    <div class="toolbar-group">
      <el-tooltip content="导出 Word" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" @click="exportWord">
          <Icon icon="mdi:file-word-outline" class="btn-icon-large" />
          <span class="btn-text">导出 Word</span>
        </button>
      </el-tooltip>
    </div>

    <div class="toolbar-divider"></div>

    <div class="toolbar-group">
      <el-tooltip content="导出 PDF" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" @click="exportPdf">
          <Icon icon="mdi:file-pdf-box" class="btn-icon-large" />
          <span class="btn-text">导出 PDF</span>
        </button>
      </el-tooltip>
    </div>

    <div class="toolbar-group">
      <el-tooltip content="导出纯文本" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" @click="exportText">
          <Icon icon="mdi:file-document-outline" class="btn-icon-large" />
          <span class="btn-text">导出纯文本</span>
        </button>
      </el-tooltip>
    </div>

    <div class="toolbar-divider"></div>

    <div class="toolbar-group">
      <el-tooltip content="打印" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" @click="printDocument">
          <Icon icon="mdi:printer-outline" class="btn-icon-large" />
          <span class="btn-text">打印</span>
        </button>
      </el-tooltip>
    </div>

    <div class="toolbar-group">
      <el-tooltip content="打印预览" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" @click="printPreview">
          <Icon icon="mdi:printer-eye" class="btn-icon-large" />
          <span class="btn-text">打印预览</span>
        </button>
      </el-tooltip>
    </div>

    <div class="toolbar-divider"></div>

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
import { inlineAllImagesAsync, restoreBlobImagesFromOriginAsync } from '@/views/utils/fileUtils'
import { downloadBlob, wrapInExportHtml } from '@/views/utils/documentExport'
import { copyToClipboard } from '@/views/utils/clipboard'
import { checkConverterHealth, exportDocx, exportPdf as apiExportPdf } from '@/api/converter'
import { useDocMetadataStore } from '@/store/modules/docMetadata'
import { useDocBufferStore } from '@/store/modules/docBuffer'
import { javaRequest } from '@/config/axios/javaService'

const editor = useEditor()

const htmlPreviewVisible = ref(false)
const previewMode = ref<'preview' | 'source'>('preview')
const previewContent = ref('')

const formattedHtml = computed(() => {
  if (!previewContent.value) return ''
  return previewContent.value
    .replace(/></g, '>\n<')
    .replace(/(<\/?[^>]+>)/g, '\n$1')
    .split('\n')
    .filter((line) => line.trim())
    .join('\n')
})

const generateFullHtml = async (): Promise<string> => {
  if (!editor.value) return ''

  const raw = editor.value.getHTML()
  // 把所有图片（blob: / http(s)://）内联为 data URL：
  //   1. 保证离线/打印窗口能直接渲染
  //   2. 保证后端 Puppeteer 渲染 PDF 时无需外网访问 MinIO
  const restored = await inlineAllImagesAsync(raw)
  return wrapInExportHtml(restored, '文档')
}

const previewHtml = async () => {
  if (!editor.value) {
    ElMessage.warning('编辑器未就绪')
    return
  }
  const content = editor.value.getHTML()
  previewContent.value = await restoreBlobImagesFromOriginAsync(content)
  previewMode.value = 'preview'
  htmlPreviewVisible.value = true
}

const exportHtml = async () => {
  const html = await generateFullHtml()
  downloadFile(html, '文档.html', 'text/html')
  ElMessage.success('HTML 已导出')
}

/**
 * 选择性保存高保真方案：导出前尝试获取原始 DOCX 字节，交给 converter 做字节级选择性保存。
 *   1. 优先读 docBufferStore.originalDocx 内存缓存（首次打开时已预热）。
 *   2. 未命中再调 /getPlan/getOriginalFile 回源。
 *   3. 回源失败 / 204 无原始文件 → 返回 null，converter 自动降级到 legacy 全量重生成。
 *
 * 返回值作为 exportDocx 的 options.originalDocx 传入。
 */
const fetchOriginalDocx = async (docId: string): Promise<ArrayBuffer | null> => {
  if (!docId) return null
  const bufferStore = useDocBufferStore()
  const cached = bufferStore.getOriginalDocx(docId)
  if (cached) return cached
  try {
    const buffer = await javaRequest.downloadArrayBuffer(
      '/getPlan/getOriginalFile',
      { id: docId }
    )
    if (buffer && buffer.byteLength > 0) {
      bufferStore.setOriginalDocx(docId, buffer)
      return buffer
    }
  } catch (err) {
    console.warn('获取原始 DOCX 失败，将走 legacy 导出路径:', err)
  }
  return null
}

const exportWord = async () => {
  if (!editor.value) return

  try {
    const json = editor.value.getJSON()
    const metaStore = useDocMetadataStore()
    const docId = metaStore.docId ?? ''
    const originalDocx = docId ? await fetchOriginalDocx(docId) : null
    const blob = await exportDocx(json, metaStore.metadata ?? undefined, {
      originalDocx
    })
    downloadBlob(blob, '文档.docx')
    ElMessage.success('Word 文档已导出')
  } catch (error) {
    console.error('导出 Word 失败:', error)
    ElMessage.error('导出失败')
  }
}

const exportPdf = async () => {
  if (!editor.value) return

  const health = await checkConverterHealth()
  if (health.available) {
    try {
      // Puppeteer 模式：发送完整 HTML（已内联所有图片）+ PdfOptions
      const html = await generateFullHtml()
      const blob = await apiExportPdf(html, {
        format: 'A4',
        margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' },
        printBackground: true,
      })
      downloadBlob(blob, '文档.pdf')
      ElMessage.success('PDF 已导出')
      return
    } catch (err) {
      console.warn('转换服务导出 PDF 失败，降级到浏览器打印:', err)
      ElMessage.warning('转换服务导出失败，已使用浏览器打印模式')
    }
  } else {
    ElMessage.warning('转换服务暂不可用，已使用浏览器打印模式导出 PDF')
  }

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

const exportText = () => {
  if (!editor.value) return

  const text = editor.value.getText()
  downloadFile(text, '文档.txt', 'text/plain')
  ElMessage.success('纯文本已导出')
}

const copyHtml = async () => {
  try {
    const html = await generateFullHtml()
    const ok = await copyToClipboard(html)
    if (ok) {
      ElMessage.success('HTML 已复制到剪贴板')
    } else {
      ElMessage.error('复制失败')
    }
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

const downloadHtml = async () => {
  const html = await generateFullHtml()
  downloadFile(html, '文档.html', 'text/html')
  ElMessage.success('HTML 已下载')
}

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

const copyShareLink = async () => {
  const ok = await copyToClipboard(window.location.href)
  if (ok) {
    ElMessage.success('链接已复制')
  } else {
    ElMessage.error('复制失败')
  }
}

const shareToEmail = () => {
  const subject = encodeURIComponent('文档分享')
  const body = encodeURIComponent(`请查看文档：${window.location.href}`)
  window.open(`mailto:?subject=${subject}&body=${body}`)
}

const generateQrCode = () => {
  ElMessage.info('二维码功能开发中')
}

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
