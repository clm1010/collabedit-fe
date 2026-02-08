<template>
  <div
    class="h-14 bg-white border-b flex items-center justify-between px-4 shadow-sm z-20 flex-shrink-0"
  >
    <div class="flex items-center gap-4">
      <el-button link @click="$emit('back')">
        <Icon icon="ep:arrow-left" class="mr-1" /> 返回
      </el-button>
      <!-- 文档标题 -->
      <div class="text-lg font-bold text-gray-800">{{ title }}</div>
      <!-- 文档时间信息 -->
      <div class="flex items-center gap-4 text-xs text-gray-500">
        <div class="flex items-center">
          <span class="text-gray-400">创建时间:</span>
          <span class="ml-1">{{ createTime }}</span>
        </div>
        <div class="flex items-center">
          <span class="text-gray-400">最后更新:</span>
          <span class="ml-1">{{ updateTime }}</span>
        </div>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <!-- 保存状态 -->
      <div class="mr-2 flex items-center text-xs text-gray-500">
        <span
          class="w-2 h-2 rounded-full mr-1.5 transition-colors duration-300"
          :class="hasUnsavedChanges ? 'bg-red-500' : 'bg-green-500'"
        ></span>
        {{ hasUnsavedChanges ? '文档未保存' : '文档已保存' }}
      </div>
      <!-- 连接状态 -->
      <div class="mr-4 flex items-center text-xs text-gray-500">
        <span
          class="w-2 h-2 rounded-full mr-1.5 transition-colors duration-300"
          :class="connectionStatusClass"
        ></span>
        {{ connectionStatus }}
      </div>
      <!-- 诊断工具 -->
      <template v-if="showDiagnostics">
        <el-button size="default" @click="$emit('diagnostics-compare')">诊断对比</el-button>
        <el-button size="default" @click="$emit('diagnostics-export')">诊断导出</el-button>
        <el-button size="default" @click="$emit('diagnostics-export-images')"
          >异常图片导出</el-button
        >
        <el-button size="default" @click="$emit('diagnostics-export-rendered')"
          >渲染图片导出</el-button
        >
        <el-button size="default" @click="$emit('diagnostics-locate-images')"
          >定位异常图片</el-button
        >
        <el-button size="default" @click="$emit('diagnostics-export-anomaly-images')"
          >异常图片文件导出</el-button
        >
      </template>
      <!-- 审核模式：显示审核和驳回按钮 -->
      <template v-if="isReviewMode">
        <el-button type="success" size="default" @click="$emit('review-approve')">
          <Icon icon="ep:check" class="mr-1" />
          审核通过
        </el-button>
        <el-button type="danger" size="default" @click="$emit('review-reject')">
          <Icon icon="ep:close" class="mr-1" />
          驳回
        </el-button>
      </template>
      <!-- 非审核模式：显示提交审核和保存按钮 -->
      <template v-else>
        <el-button type="primary" plain size="default" @click="$emit('submit-audit')"
          >提交审核</el-button
        >
        <el-button type="primary" size="default" @click="$emit('save')" :loading="isSaving">
          保存
        </el-button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@/components/Icon'

// Props 定义
interface Props {
  /** 文档标题 */
  title: string
  /** 创建时间 */
  createTime: string
  /** 更新时间 */
  updateTime: string
  /** 连接状态文本 */
  connectionStatus: string
  /** 是否为审核模式 */
  isReviewMode?: boolean
  /** 是否为只读模式 */
  isReadonly?: boolean
  /** 是否正在保存 */
  isSaving?: boolean
  /** 是否有未保存的更改 */
  hasUnsavedChanges?: boolean
  /** 是否显示诊断工具 */
  showDiagnostics?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isReviewMode: false,
  isReadonly: false,
  isSaving: false,
  hasUnsavedChanges: false,
  showDiagnostics: false
})

// Emits 定义
defineEmits<{
  (e: 'back'): void
  (e: 'save'): void
  (e: 'submit-audit'): void
  (e: 'review-approve'): void
  (e: 'review-reject'): void
  (e: 'diagnostics-compare'): void
  (e: 'diagnostics-export'): void
  (e: 'diagnostics-export-images'): void
  (e: 'diagnostics-export-rendered'): void
  (e: 'diagnostics-locate-images'): void
  (e: 'diagnostics-export-anomaly-images'): void
}>()

// 连接状态样式
const connectionStatusClass = computed(() => {
  switch (props.connectionStatus) {
    case '已连接':
      return 'bg-green-500'
    case '连接断开':
      return 'bg-red-500'
    case '连接中...':
    case '未连接':
    default:
      return 'bg-yellow-500'
  }
})
</script>
