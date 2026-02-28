<template>
  <Teleport to="body">
    <div
      v-show="visible"
      ref="popoverRef"
      class="link-popover"
      :style="popoverStyle"
      @mousedown.stop
    >
      <div class="link-popover-content">
        <div class="link-icon">
          <Icon icon="mdi:link" />
        </div>

        <input
          ref="inputRef"
          v-model="inputUrl"
          type="text"
          class="link-input"
          placeholder="输入链接地址..."
          @keydown.enter="handleApply"
          @keydown.escape="handleClose"
        />

        <button
          class="link-btn link-btn-apply"
          @click="handleApply"
          title="应用链接 (Enter)"
          :disabled="!inputUrl.trim()"
        >
          <Icon icon="mdi:keyboard-return" />
        </button>

        <div class="link-divider" v-if="hasExistingLink"></div>

        <button
          v-if="hasExistingLink"
          class="link-btn"
          @click="handleOpenLink"
          title="在新窗口打开链接"
        >
          <Icon icon="mdi:open-in-new" />
        </button>

        <button v-if="hasExistingLink" class="link-btn" @click="handleCopyLink" title="复制链接">
          <Icon icon="mdi:content-copy" />
        </button>

        <button
          v-if="hasExistingLink"
          class="link-btn link-btn-delete"
          @click="handleRemoveLink"
          title="删除链接"
        >
          <Icon icon="mdi:trash-can-outline" />
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { Icon } from '@/components/Icon'
import { ElMessage } from 'element-plus'

interface Props {
  editor: any
  visible: boolean
  initialUrl?: string
  triggerRect?: DOMRect | null
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  initialUrl: '',
  triggerRect: null
})

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'apply', url: string): void
  (e: 'remove'): void
}>()

const popoverRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)

const inputUrl = ref('')

const hasExistingLink = computed(() => {
  return props.initialUrl && props.initialUrl.trim() !== ''
})

const popoverStyle = computed(() => {
  if (!props.triggerRect) {
    return {
      top: '0px',
      left: '0px',
      visibility: 'hidden' as const
    }
  }

  const top = props.triggerRect.bottom + window.scrollY + 8
  const left = props.triggerRect.left + window.scrollX

  return {
    top: `${top}px`,
    left: `${left}px`,
    visibility: 'visible' as const
  }
})

watch(
  () => props.visible,
  async (newVisible) => {
    if (newVisible) {
      inputUrl.value = props.initialUrl || ''
      await nextTick()
      if (inputRef.value) {
        inputRef.value.focus()
        inputRef.value.select()
      }
    }
  },
  { immediate: true }
)

watch(
  () => props.initialUrl,
  (newUrl) => {
    if (props.visible) {
      inputUrl.value = newUrl || ''
    }
  }
)

const handleApply = () => {
  const url = inputUrl.value.trim()
  if (!url) return

  // 如果没有协议，自动添加 https://
  let finalUrl = url
  if (!/^https?:\/\//i.test(url) && !/^mailto:/i.test(url)) {
    finalUrl = `https://${url}`
  }

  emit('apply', finalUrl)
  handleClose()
}

const handleOpenLink = () => {
  const url = inputUrl.value.trim() || props.initialUrl
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

const handleCopyLink = async () => {
  const url = inputUrl.value.trim() || props.initialUrl
  if (!url) return

  try {
    // 优先使用 Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url)
      ElMessage.success('链接已复制到剪贴板')
    } else {
      // 备用方案：使用 execCommand
      const textArea = document.createElement('textarea')
      textArea.value = url
      textArea.style.position = 'fixed'
      textArea.style.left = '-9999px'
      textArea.style.top = '-9999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      const successful = document.execCommand('copy')
      document.body.removeChild(textArea)
      if (successful) {
        ElMessage.success('链接已复制到剪贴板')
      } else {
        ElMessage.error('复制链接失败')
      }
    }
  } catch (error) {
    console.error('复制链接失败:', error)
    ElMessage.error('复制链接失败')
  }
}

const handleRemoveLink = () => {
  emit('remove')
  handleClose()
}

const handleClose = () => {
  emit('update:visible', false)
}

const handleClickOutside = (event: MouseEvent) => {
  if (props.visible && popoverRef.value && !popoverRef.value.contains(event.target as Node)) {
    handleClose()
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})
</script>

<style lang="scss" scoped>
.link-popover {
  position: absolute;
  z-index: 9999;
  background: #fff;
  border-radius: 8px;
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.12),
    0 0 1px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  padding: 8px;
  min-width: 320px;
  max-width: 500px;
}

.link-popover-content {
  display: flex;
  align-items: center;
  gap: 6px;
}

.link-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: #9ca3af;
  flex-shrink: 0;

  :deep(svg) {
    width: 18px;
    height: 18px;
  }
}

.link-input {
  flex: 1;
  min-width: 0;
  height: 32px;
  padding: 0 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 14px;
  color: #374151;
  background: #f9fafb;
  outline: none;
  transition: all 0.15s ease;

  &::placeholder {
    color: #9ca3af;
  }

  &:focus {
    border-color: #2563eb;
    background: #fff;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
  }
}

.link-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.15s ease;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    background: #f3f4f6;
    color: #374151;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  :deep(svg) {
    width: 18px;
    height: 18px;
  }
}

.link-btn-apply {
  background: #2563eb;
  color: #fff;

  &:hover:not(:disabled) {
    background: #1d4ed8;
    color: #fff;
  }
}

.link-btn-delete {
  &:hover {
    background: #fef2f2;
    color: #dc2626;
  }
}

.link-divider {
  width: 1px;
  height: 20px;
  background: #e5e7eb;
  margin: 0 2px;
  flex-shrink: 0;
}
</style>
