<template>
  <node-view-wrapper class="page-break-wrapper" :class="{ 'is-selected': selected }">
    <div class="page-break-container" contenteditable="false">
      <div class="page-break-line">
        <div class="page-break-label">
          <span class="label-text">分页符</span>
        </div>
      </div>

      <!-- 删除按钮 - 选中时显示 -->
      <button
        v-if="selected && editor?.isEditable"
        class="delete-btn"
        @click="deleteNode?.()"
        title="删除分页符"
      >
        ✕
      </button>
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { toRefs } from 'vue'
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)
const { editor, selected, deleteNode } = toRefs(props)
</script>

<style lang="scss" scoped>
.page-break-wrapper {
  display: block;
  margin: 24px 0;
  padding: 0;
  user-select: none;

  &.is-selected .page-break-container {
    .page-break-line {
      &::before {
        border-color: #1a73e8;
      }

      .page-break-label {
        border-color: #1a73e8;
        background: #1a73e8;
        color: #fff;
      }
    }
  }
}

.page-break-container {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  cursor: pointer;
}

.page-break-line {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 24px;

  // 虚线背景
  &::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    height: 0;
    border-top: 1px dashed #d0d0d0;
    transition: border-color 0.2s ease;
  }

  .page-break-label {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px 16px;
    background: #fff;
    border: 1px solid #d0d0d0;
    border-radius: 4px;
    font-size: 12px;
    color: #666;
    transition: all 0.2s ease;

    .label-text {
      font-weight: 400;
      letter-spacing: 0.5px;
    }
  }
}

.delete-btn {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 50%;
  background: #ff4d4f;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  opacity: 0;
  transition: all 0.2s ease;

  .page-break-wrapper.is-selected & {
    opacity: 1;
  }

  &:hover {
    transform: translateY(-50%) scale(1.1);
    box-shadow: 0 2px 6px rgba(255, 77, 79, 0.4);
  }
}

// 打印时隐藏视觉元素，但保持分页效果
@media print {
  .page-break-wrapper {
    margin: 0;
    height: 0;
    page-break-after: always;
    break-after: page;
  }

  .page-break-container,
  .page-break-line,
  .delete-btn {
    display: none;
  }
}
</style>
