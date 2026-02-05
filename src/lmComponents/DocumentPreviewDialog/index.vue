<template>
  <el-dialog
    v-model="dialogVisible"
    :fullscreen="true"
    :show-close="false"
    class="document-preview-dialog"
    :close-on-click-modal="false"
  >
    <template #header>
      <div class="preview-header">
        <div class="header-left">
          <span class="doc-title">{{ title || '文档预览' }}</span>
        </div>
        <div class="header-right">
          <button class="close-btn" @click="handleClose">
            <Icon icon="mdi:close" />
          </button>
        </div>
      </div>
    </template>
    <div class="preview-body">
      <div class="preview-content-wrapper">
        <div class="preview-page" :style="{ transform: `scale(${zoom / 100})` }">
          <div class="page-content" v-html="content"></div>
        </div>
      </div>
    </div>
    <template #footer>
      <div class="preview-footer">
        <div class="footer-left"></div>
        <div class="footer-right">
          <button class="zoom-btn" @click="toggleFullscreen" title="全屏">
            <Icon icon="mdi:fullscreen" />
          </button>
          <div class="zoom-slider">
            <button class="zoom-btn" @click="zoomOut" title="缩小">
              <Icon icon="mdi:minus" />
            </button>
            <el-slider
              v-model="zoom"
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
          <span class="zoom-value">{{ zoom }}%</span>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Icon } from '@/components/Icon'

defineOptions({ name: 'DocumentPreviewDialog' })

// Props
const props = defineProps<{
  visible: boolean
  content: string
  title?: string
}>()

// Emits
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
}>()

// 缩放比例
const zoom = ref(100)

// 控制对话框显示
const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

// 关闭对话框
const handleClose = () => {
  dialogVisible.value = false
}

// 缩小
const zoomOut = () => {
  if (zoom.value > 50) {
    zoom.value -= 10
  }
}

// 放大
const zoomIn = () => {
  if (zoom.value < 200) {
    zoom.value += 10
  }
}

// 适应宽度
const fitToWidth = () => {
  zoom.value = 100
}

// 全屏切换
const toggleFullscreen = () => {
  if (document.fullscreenElement) {
    document.exitFullscreen()
  } else {
    document.documentElement.requestFullscreen()
  }
}

// 重置缩放（当对话框关闭时）
watch(
  () => props.visible,
  (val) => {
    if (!val) {
      zoom.value = 100
    }
  }
)
</script>

<style scoped lang="scss">
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

    // 代码块内的 code 标签样式
    code {
      background: transparent;
      padding: 0;
      border-radius: 0;
      color: inherit;
      font-size: inherit;
    }
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

  // 水平线样式
  :deep(hr) {
    border: none;
    border-top: 2px solid #e5e7eb;
    margin: 2em 0;

    &.red-line,
    &[data-line-color='red'] {
      border-top-color: #ff0000;
    }
  }

  // AI 模块块级样式
  :deep(.ai-block-node),
  :deep(div[data-type='ai-block-node']) {
    display: block;
    width: 100%;
    margin: 16px 0;
    padding: 16px;
    border: 1px solid #e8a849;
    border-radius: 4px;
    background-color: #fff;
    position: relative;

    p {
      margin: 0.5em 0;
      line-height: 1.75;
      text-indent: 2em;
    }

    strong,
    b {
      font-weight: 700;
      color: #333;
    }

    ul,
    ol {
      margin: 0.5em 0;
      padding-left: 1.5em;
    }

    li {
      text-indent: 0;
    }
  }

  // AI 模块行内样式
  :deep(.ai-block),
  :deep(span[data-type='ai-block']) {
    background-color: #e3f2fd;
    border: 1px solid #90caf9;
    border-radius: 4px;
    padding: 2px 6px;
  }

  // 红头文件表格样式
  :deep(table.red-header-table),
  :deep(table.editor-table) {
    border: none !important;
    width: 100%;
    margin: 0;
    border-collapse: collapse;

    td,
    th {
      border: none !important;
      padding: 0;
      background: transparent !important;
    }
  }

  // 高亮标记样式
  :deep(mark) {
    background-color: #ffff00;
    color: inherit;
    padding: 0 2px;
  }

  // 字体颜色样式
  :deep(span[style*='color']) {
    color: inherit;
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
