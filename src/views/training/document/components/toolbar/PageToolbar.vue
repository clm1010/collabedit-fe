<template>
  <div class="page-toolbar">
    <!-- 显示大纲 -->
    <div class="toolbar-group">
      <el-tooltip content="显示大纲" placement="bottom" :show-after="500">
        <button
          class="toolbar-btn-large"
          :class="{ active: pageSettings.showOutline }"
          @click="toggleOutline"
        >
          <Icon icon="mdi:format-list-bulleted-type" class="btn-icon-large" />
          <span class="btn-text">显示大纲</span>
        </button>
      </el-tooltip>
    </div>

    <!-- 页边距 -->
    <div class="toolbar-group">
      <el-popover placement="bottom" :width="280" trigger="click">
        <template #reference>
          <span>
            <el-tooltip content="页边距" placement="bottom" :show-after="500">
              <button class="toolbar-btn-large">
                <Icon icon="mdi:page-layout-sidebar-left" class="btn-icon-large" />
                <span class="btn-text">页边距</span>
              </button>
            </el-tooltip>
          </span>
        </template>
        <div class="margin-panel">
          <div class="preset-margins">
            <div class="preset-label">预设页边距</div>
            <div class="preset-options">
              <button
                v-for="preset in marginPresets"
                :key="preset.name"
                class="preset-btn"
                :class="{ active: isCurrentMargin(preset) }"
                @click="applyMarginPreset(preset)"
              >
                <div class="preset-preview">
                  <div
                    class="preview-page"
                    :style="{
                      padding: `${preset.top / 4}px ${preset.right / 4}px ${preset.bottom / 4}px ${preset.left / 4}px`
                    }"
                  >
                    <div class="preview-content"></div>
                  </div>
                </div>
                <span>{{ preset.name }}</span>
              </button>
            </div>
          </div>
          <div class="custom-margins">
            <div class="custom-label">自定义页边距 (mm)</div>
            <div class="margin-inputs">
              <div class="input-row">
                <span class="input-label">上:</span>
                <el-input-number
                  v-model="pageSettings.margin.top"
                  :min="0"
                  :max="100"
                  :step="5"
                  size="small"
                  @change="applyMargin"
                />
                <span class="input-label">下:</span>
                <el-input-number
                  v-model="pageSettings.margin.bottom"
                  :min="0"
                  :max="100"
                  :step="5"
                  size="small"
                  @change="applyMargin"
                />
              </div>
              <div class="input-row">
                <span class="input-label">左:</span>
                <el-input-number
                  v-model="pageSettings.margin.left"
                  :min="0"
                  :max="100"
                  :step="5"
                  size="small"
                  @change="applyMargin"
                />
                <span class="input-label">右:</span>
                <el-input-number
                  v-model="pageSettings.margin.right"
                  :min="0"
                  :max="100"
                  :step="5"
                  size="small"
                  @change="applyMargin"
                />
              </div>
            </div>
          </div>
        </div>
      </el-popover>
    </div>

    <!-- 页面大小 -->
    <div class="toolbar-group">
      <el-popover placement="bottom" :width="240" trigger="click">
        <template #reference>
          <span>
            <el-tooltip content="页面大小" placement="bottom" :show-after="500">
              <button class="toolbar-btn-large">
                <Icon icon="mdi:file-document-outline" class="btn-icon-large" />
                <span class="btn-text">页面大小</span>
              </button>
            </el-tooltip>
          </span>
        </template>
        <div class="page-size-panel">
          <div class="size-options">
            <button
              v-for="size in pageSizes"
              :key="size.name"
              class="size-btn"
              :class="{ active: pageSettings.size === size.name }"
              @click="applyPageSize(size)"
            >
              <div class="size-info">
                <span class="size-name">{{ size.name }}</span>
                <span class="size-dimensions">{{ size.width }}厘米 × {{ size.height }}厘米</span>
              </div>
            </button>
          </div>
        </div>
      </el-popover>
    </div>

    <!-- 页面方向 -->
    <div class="toolbar-group">
      <el-popover placement="bottom" :width="200" trigger="click">
        <template #reference>
          <span>
            <el-tooltip content="页面方向" placement="bottom" :show-after="500">
              <button class="toolbar-btn-large">
                <Icon icon="mdi:page-layout-body" class="btn-icon-large" />
                <span class="btn-text">页面方向</span>
              </button>
            </el-tooltip>
          </span>
        </template>
        <div class="orientation-panel">
          <button
            class="orientation-btn"
            :class="{ active: pageSettings.orientation === 'portrait' }"
            @click="setOrientation('portrait')"
          >
            <div class="orientation-preview portrait"></div>
            <span>纵向</span>
          </button>
          <button
            class="orientation-btn"
            :class="{ active: pageSettings.orientation === 'landscape' }"
            @click="setOrientation('landscape')"
          >
            <div class="orientation-preview landscape"></div>
            <span>横向</span>
          </button>
        </div>
      </el-popover>
    </div>

    <div class="toolbar-divider"></div>

    <!-- 分页符 -->
    <div class="toolbar-group">
      <el-tooltip content="分页符" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" @click="insertPageBreak">
          <Icon icon="mdi:format-page-break" class="btn-icon-large" />
          <span class="btn-text">分页符</span>
        </button>
      </el-tooltip>
    </div>

    <!-- 显示换行 -->
    <div class="toolbar-group">
      <el-tooltip content="显示换行" placement="bottom" :show-after="500">
        <button
          class="toolbar-btn-large"
          :class="{ active: pageSettings.showLineBreak }"
          @click="toggleLineBreak"
        >
          <Icon icon="mdi:keyboard-return" class="btn-icon-large" />
          <span class="btn-text">显示换行</span>
        </button>
      </el-tooltip>
    </div>

    <!-- 显示行号 -->
    <div class="toolbar-group">
      <el-tooltip content="显示行号" placement="bottom" :show-after="500">
        <button
          class="toolbar-btn-large"
          :class="{ active: pageSettings.showLineNumber }"
          @click="toggleLineNumber"
        >
          <Icon icon="mdi:format-list-numbered" class="btn-icon-large" />
          <span class="btn-text">显示行号</span>
        </button>
      </el-tooltip>
    </div>

    <div class="toolbar-divider"></div>

    <!-- 页面水印 -->
    <div class="toolbar-group">
      <el-popover placement="bottom" :width="320" trigger="click">
        <template #reference>
          <span>
            <el-tooltip content="页面水印" placement="bottom" :show-after="500">
              <button class="toolbar-btn-large">
                <Icon icon="mdi:watermark" class="btn-icon-large" />
                <span class="btn-text">页面水印</span>
              </button>
            </el-tooltip>
          </span>
        </template>
        <div class="watermark-panel">
          <el-form :model="watermarkSettings" label-width="80px" size="small">
            <el-form-item label="启用水印">
              <el-switch v-model="watermarkSettings.enabled" @change="applyWatermark" />
            </el-form-item>
            <el-form-item label="水印文字">
              <el-input
                v-model="watermarkSettings.text"
                placeholder="请输入水印文字"
                @change="applyWatermark"
              />
            </el-form-item>
            <el-form-item label="字体大小">
              <el-slider
                v-model="watermarkSettings.fontSize"
                :min="12"
                :max="48"
                @change="applyWatermark"
              />
            </el-form-item>
            <el-form-item label="透明度">
              <el-slider
                v-model="watermarkSettings.opacity"
                :min="0.05"
                :max="0.5"
                :step="0.05"
                @change="applyWatermark"
              />
            </el-form-item>
            <el-form-item label="旋转角度">
              <el-slider
                v-model="watermarkSettings.rotate"
                :min="-90"
                :max="90"
                @change="applyWatermark"
              />
            </el-form-item>
            <el-form-item label="水印颜色">
              <el-color-picker v-model="watermarkSettings.color" @change="applyWatermark" />
            </el-form-item>
          </el-form>
        </div>
      </el-popover>
    </div>

    <!-- 页面背景 -->
    <div class="toolbar-group">
      <el-popover placement="bottom" :width="280" trigger="click">
        <template #reference>
          <span>
            <el-tooltip content="页面背景" placement="bottom" :show-after="500">
              <button class="toolbar-btn-large">
                <Icon icon="mdi:palette-outline" class="btn-icon-large" />
                <span class="btn-text">页面背景</span>
              </button>
            </el-tooltip>
          </span>
        </template>
        <div class="background-panel">
          <div class="bg-presets">
            <div class="preset-label">预设背景色</div>
            <div class="color-grid">
              <button
                v-for="color in bgPresetColors"
                :key="color"
                class="color-btn"
                :style="{ backgroundColor: color }"
                :class="{ active: pageSettings.background === color }"
                @click="setBackground(color)"
              ></button>
            </div>
          </div>
          <div class="custom-bg">
            <div class="custom-label">自定义背景色</div>
            <el-color-picker v-model="pageSettings.background" show-alpha @change="setBackground" />
          </div>
        </div>
      </el-popover>
    </div>

    <div class="toolbar-divider"></div>

    <!-- 演示模式 -->
    <div class="toolbar-group">
      <el-tooltip content="演示模式" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" @click="enterPresentationMode">
          <Icon icon="mdi:presentation-play" class="btn-icon-large" />
          <span class="btn-text">演示模式</span>
        </button>
      </el-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { Icon } from '@/components/Icon'
import { ElMessage } from 'element-plus'
import { useEditor } from './useEditor'

// 获取编辑器实例
const editor = useEditor()

// 页面大小选项
const pageSizes = [
  { name: 'A4', width: 21, height: 29.7 },
  { name: 'A3', width: 29.7, height: 42 },
  { name: 'A5', width: 14.8, height: 21 },
  { name: 'B5', width: 17.6, height: 25 },
  { name: '5号信封', width: 10.9, height: 12.9 },
  { name: '6号信封', width: 11.9, height: 22.9 }
]

// 页边距预设
const marginPresets = [
  { name: '普通', top: 25.4, bottom: 25.4, left: 31.8, right: 31.8 },
  { name: '窄', top: 12.7, bottom: 12.7, left: 12.7, right: 12.7 },
  { name: '适中', top: 25.4, bottom: 25.4, left: 19.1, right: 19.1 },
  { name: '宽', top: 25.4, bottom: 25.4, left: 50.8, right: 50.8 }
]

// 背景色预设
const bgPresetColors = [
  '#ffffff',
  '#f5f5f5',
  '#fef6e4',
  '#fef3e2',
  '#e8f5e9',
  '#e3f2fd',
  '#f3e5f5',
  '#fff3e0',
  '#e0f7fa',
  '#fce4ec',
  '#f1f8e9',
  '#fffde7'
]

// 页面设置状态
const pageSettings = reactive({
  size: 'A4',
  orientation: 'portrait' as 'portrait' | 'landscape',
  margin: {
    top: 25.4,
    bottom: 25.4,
    left: 31.8,
    right: 31.8
  },
  background: '#ffffff',
  showOutline: false,
  showLineBreak: false,
  showLineNumber: false
})

// 水印设置
const watermarkSettings = reactive({
  enabled: false,
  text: '',
  fontSize: 16,
  opacity: 0.2,
  rotate: -30,
  color: '#000000'
})

// 定义事件
const emit = defineEmits<{
  (e: 'page-settings-change', settings: typeof pageSettings): void
  (e: 'watermark-change', settings: typeof watermarkSettings): void
}>()

// 判断是否是当前页边距
const isCurrentMargin = (preset: (typeof marginPresets)[0]) => {
  return (
    pageSettings.margin.top === preset.top &&
    pageSettings.margin.bottom === preset.bottom &&
    pageSettings.margin.left === preset.left &&
    pageSettings.margin.right === preset.right
  )
}

// 应用页边距预设
const applyMarginPreset = (preset: (typeof marginPresets)[0]) => {
  pageSettings.margin.top = preset.top
  pageSettings.margin.bottom = preset.bottom
  pageSettings.margin.left = preset.left
  pageSettings.margin.right = preset.right
  applyMargin()
}

// 应用页边距
const applyMargin = () => {
  emit('page-settings-change', { ...pageSettings })
  ElMessage.success('页边距已更新')
}

// 应用页面大小
const applyPageSize = (size: (typeof pageSizes)[0]) => {
  pageSettings.size = size.name
  emit('page-settings-change', { ...pageSettings })
  ElMessage.success(`页面大小已设置为 ${size.name}`)
}

// 设置页面方向
const setOrientation = (orientation: 'portrait' | 'landscape') => {
  pageSettings.orientation = orientation
  emit('page-settings-change', { ...pageSettings })
  ElMessage.success(`页面方向已设置为 ${orientation === 'portrait' ? '纵向' : '横向'}`)
}

// 切换大纲显示
const toggleOutline = () => {
  pageSettings.showOutline = !pageSettings.showOutline
  emit('page-settings-change', { ...pageSettings })
}

// 切换换行符显示
const toggleLineBreak = () => {
  pageSettings.showLineBreak = !pageSettings.showLineBreak
  emit('page-settings-change', { ...pageSettings })
}

// 切换行号显示
const toggleLineNumber = () => {
  pageSettings.showLineNumber = !pageSettings.showLineNumber
  emit('page-settings-change', { ...pageSettings })
}

// 设置背景色
const setBackground = (color: string | null) => {
  if (color) {
    pageSettings.background = color
    emit('page-settings-change', { ...pageSettings })
  }
}

// 插入分页符
const insertPageBreak = () => {
  if (!editor.value) return
  // 使用 PageBreak 扩展插入分页符
  editor.value.chain().focus().setPageBreak().run()
  ElMessage.success('分页符已插入')
}

// 应用水印
const applyWatermark = () => {
  emit('watermark-change', { ...watermarkSettings })
}

// 进入演示模式
const enterPresentationMode = () => {
  if (!editor.value) return

  const content = editor.value.getHTML()
  const presentWindow = window.open('', '_blank')

  if (!presentWindow) {
    ElMessage.error('无法打开演示窗口，请检查浏览器是否阻止弹窗')
    return
  }

  presentWindow.document.write(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <title>文档演示</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif;
          background: #1a1a1a;
          color: #fff;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
        }
        .content {
          max-width: 1000px;
          background: #fff;
          color: #333;
          padding: 60px;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          line-height: 1.8;
        }
        h1 { font-size: 2.5em; margin-bottom: 0.5em; }
        h2 { font-size: 1.8em; margin-top: 1.5em; margin-bottom: 0.5em; }
        h3 { font-size: 1.4em; margin-top: 1.2em; margin-bottom: 0.5em; }
        p { margin: 1em 0; }
        ul, ol { padding-left: 2em; margin: 1em 0; }
        blockquote { border-left: 4px solid #2563eb; padding-left: 1em; margin: 1em 0; color: #666; }
        table { border-collapse: collapse; width: 100%; margin: 1em 0; }
        th, td { border: 1px solid #e5e7eb; padding: 12px; }
        th { background: #f9fafb; }
        code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
        pre { background: #1f2937; color: #f9fafb; padding: 16px; border-radius: 8px; overflow-x: auto; }
        .controls {
          position: fixed;
          bottom: 20px;
          right: 20px;
          display: flex;
          gap: 10px;
        }
        .controls button {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          background: #2563eb;
          color: #fff;
          cursor: pointer;
          font-size: 14px;
        }
        .controls button:hover { background: #1d4ed8; }
      </style>
    </head>
    <body>
      <div class="content">${content}</div>
      <div class="controls">
        <button onclick="window.close()">退出演示</button>
      </div>
    </body>
    </html>
  `)
  presentWindow.document.close()
}

// 监听设置变化，通知父组件
watch(
  pageSettings,
  () => {
    emit('page-settings-change', { ...pageSettings })
  },
  { deep: true }
)
</script>

<style lang="scss" scoped>
.page-toolbar {
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

  &.active {
    background: #d3e3fd;
    color: #1a73e8;
  }

  .btn-icon-large {
    font-size: 22px;
  }

  .btn-text {
    font-size: 11px;
  }
}

// 页边距面板
.margin-panel {
  .preset-margins {
    margin-bottom: 16px;

    .preset-label {
      font-size: 12px;
      color: #666;
      margin-bottom: 8px;
    }

    .preset-options {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }

    .preset-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 8px;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      background: #fff;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        border-color: #1a73e8;
      }

      &.active {
        border-color: #1a73e8;
        background: #e8f0fe;
      }

      .preset-preview {
        width: 32px;
        height: 40px;
        border: 1px solid #ccc;
        background: #f5f5f5;

        .preview-page {
          width: 100%;
          height: 100%;
          background: #fff;

          .preview-content {
            width: 100%;
            height: 100%;
            background: #e0e0e0;
          }
        }
      }

      span {
        font-size: 11px;
        color: #666;
      }
    }
  }

  .custom-margins {
    .custom-label {
      font-size: 12px;
      color: #666;
      margin-bottom: 8px;
    }

    .margin-inputs {
      display: flex;
      flex-direction: column;
      gap: 8px;

      .input-row {
        display: flex;
        align-items: center;
        gap: 8px;

        .input-label {
          font-size: 12px;
          color: #666;
          width: 20px;
        }

        :deep(.el-input-number) {
          width: 80px;
        }
      }
    }
  }
}

// 页面大小面板
.page-size-panel {
  .size-options {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .size-btn {
    display: flex;
    align-items: center;
    padding: 10px 12px;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    background: #fff;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      border-color: #1a73e8;
      background: #f8faff;
    }

    &.active {
      border-color: #1a73e8;
      background: #e8f0fe;
    }

    .size-info {
      display: flex;
      flex-direction: column;
      align-items: flex-start;

      .size-name {
        font-size: 13px;
        font-weight: 500;
        color: #333;
      }

      .size-dimensions {
        font-size: 11px;
        color: #999;
      }
    }
  }
}

// 页面方向面板
.orientation-panel {
  display: flex;
  gap: 16px;
  justify-content: center;

  .orientation-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background: #fff;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      border-color: #1a73e8;
    }

    &.active {
      border-color: #1a73e8;
      background: #e8f0fe;
    }

    .orientation-preview {
      border: 1px solid #999;
      background: #fff;

      &.portrait {
        width: 24px;
        height: 32px;
      }

      &.landscape {
        width: 32px;
        height: 24px;
      }
    }

    span {
      font-size: 12px;
      color: #666;
    }
  }
}

// 水印面板
.watermark-panel {
  :deep(.el-form-item) {
    margin-bottom: 12px;
  }
}

// 背景面板
.background-panel {
  .bg-presets {
    margin-bottom: 16px;

    .preset-label {
      font-size: 12px;
      color: #666;
      margin-bottom: 8px;
    }

    .color-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 6px;
    }

    .color-btn {
      width: 32px;
      height: 32px;
      border: 2px solid #e0e0e0;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        border-color: #1a73e8;
        transform: scale(1.1);
      }

      &.active {
        border-color: #1a73e8;
        box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.3);
      }
    }
  }

  .custom-bg {
    .custom-label {
      font-size: 12px;
      color: #666;
      margin-bottom: 8px;
    }
  }
}
</style>
