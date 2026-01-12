<template>
  <div class="editor-toolbar">
    <!-- 标签栏 -->
    <div class="toolbar-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
      <div class="tab-spacer"></div>
      <div class="toolbar-status">
        <span class="status-dot" :class="saveStatus"></span>
        <span class="status-text">{{ saveStatusText }}</span>
      </div>
      <button
        class="toggle-btn"
        @click="toggleToolbar"
        :title="collapsed ? '展开工具栏' : '收起工具栏'"
      >
        <Icon :icon="collapsed ? 'mdi:chevron-down' : 'mdi:chevron-up'" />
        切换工具栏
      </button>
    </div>

    <!-- 工具栏内容 -->
    <transition name="slide">
      <div v-show="!collapsed" class="toolbar-content">
        <StartToolbar v-show="activeTab === 'start'" />
        <InsertToolbar v-show="activeTab === 'insert'" />
        <TableToolbar v-show="activeTab === 'table'" />
        <ToolsToolbar v-show="activeTab === 'tools'" />
        <!-- 可扩展：页面、导出标签 -->
        <PageToolbar v-if="activeTab === 'page'" />
        <ExportToolbar v-if="activeTab === 'export'" />
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, provide, watch } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { Icon } from '@/components/Icon'
import StartToolbar from './StartToolbar.vue'
import InsertToolbar from './InsertToolbar.vue'
import TableToolbar from './TableToolbar.vue'
import ToolsToolbar from './ToolsToolbar.vue'
import { EditorKey } from './types'

import PageToolbar from './PageToolbar.vue'
import ExportToolbar from './ExportToolbar.vue'

// Props
interface Props {
  editor?: Editor
  saveStatus?: 'saved' | 'saving' | 'unsaved'
}

const props = withDefaults(defineProps<Props>(), {
  saveStatus: 'saved'
})

// 使用 ref 包装编辑器，使其响应式
const editorRef = ref(props.editor)

// 监听 props.editor 变化
watch(
  () => props.editor,
  (newEditor) => {
    editorRef.value = newEditor
  },
  { immediate: true }
)

// 提供编辑器实例给子组件
provide(EditorKey, editorRef)

// 标签配置
const tabs = [
  { key: 'start', label: '开始' },
  { key: 'insert', label: '插入' },
  { key: 'table', label: '表格' },
  { key: 'tools', label: '工具' },
  { key: 'page', label: '页面' },
  { key: 'export', label: '导出' }
]

// 状态
const activeTab = ref('start')
const collapsed = ref(false)

// 保存状态文本
const saveStatusText = computed(() => {
  const statusMap: Record<string, string> = {
    saved: '文档已保存',
    saving: '保存中...',
    unsaved: '文档未保存'
  }
  return statusMap[props.saveStatus] || '文档已保存'
})

// 切换工具栏
const toggleToolbar = () => {
  collapsed.value = !collapsed.value
}
</script>

<style lang="scss" scoped>
.editor-toolbar {
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
  user-select: none;
}

.toolbar-tabs {
  display: flex;
  align-items: center;
  padding: 0 12px;
  border-bottom: 1px solid #e8e8e8;
  background: #fafafa;

  .tab-btn {
    padding: 10px 16px;
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 13px;
    color: #666;
    position: relative;
    transition: all 0.15s ease;

    &:hover {
      color: #1a73e8;
    }

    &.active {
      color: #1a73e8;
      font-weight: 500;

      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: #1a73e8;
      }
    }
  }

  .tab-spacer {
    flex: 1;
  }

  .toolbar-status {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-right: 16px;
    font-size: 12px;
    color: #666;

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;

      &.saved {
        background: #52c41a;
      }

      &.saving {
        background: #faad14;
        animation: pulse 1s infinite;
      }

      &.unsaved {
        background: #ff4d4f;
      }
    }
  }

  .toggle-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 12px;
    color: #666;
    border-radius: 4px;
    transition: all 0.15s ease;

    &:hover {
      background: #e8f0fe;
      color: #1a73e8;
    }
  }
}

.toolbar-content {
  min-height: 60px;
  position: relative;
  z-index: 20;
}

.empty-toolbar {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60px;
  color: #999;
  font-size: 13px;
}

// 滑动动画
.slide-enter-active,
.slide-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  max-height: 0;
}

.slide-enter-to,
.slide-leave-from {
  opacity: 1;
  max-height: 200px;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
