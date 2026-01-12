<template>
  <el-tooltip :content="title" placement="bottom" :show-after="500" :disabled="!title">
    <button
      class="toolbar-btn"
      :class="{ active, disabled }"
      :disabled="disabled"
      @click="handleClick"
    >
      <Icon v-if="icon" :icon="icon" class="btn-icon" />
      <span v-if="showLabel && label" class="btn-label">{{ label }}</span>
      <Icon v-if="hasDropdown" icon="ep:arrow-down" class="dropdown-arrow" />
    </button>
  </el-tooltip>
</template>

<script setup lang="ts">
import { Icon } from '@/components/Icon'

interface Props {
  icon?: string
  label?: string
  title?: string
  active?: boolean
  disabled?: boolean
  showLabel?: boolean
  hasDropdown?: boolean
}

withDefaults(defineProps<Props>(), {
  icon: '',
  label: '',
  title: '',
  active: false,
  disabled: false,
  showLabel: false,
  hasDropdown: false
})

const emit = defineEmits<{
  click: [e: MouseEvent]
}>()

const handleClick = (e: MouseEvent) => {
  emit('click', e)
}
</script>

<style lang="scss" scoped>
.toolbar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 28px;
  height: 28px;
  padding: 0 6px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: #333;
  font-size: 13px;
  transition: all 0.15s ease;
  white-space: nowrap;

  &:hover:not(.disabled) {
    background: #e8f0fe;
    color: #1a73e8;
  }

  &.active {
    background: #d3e3fd;
    color: #1a73e8;
  }

  &.disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .btn-icon {
    font-size: 16px;
  }

  .btn-label {
    font-size: 13px;
  }

  .dropdown-arrow {
    font-size: 10px;
    margin-left: 2px;
  }
}
</style>
