<template>
  <node-view-wrapper
    class="ai-block-wrapper"
    :class="{ 'is-selected': selected, 'is-editable': editor?.isEditable }"
    data-type="ai-block-node"
  >
    <node-view-content class="ai-block-content" />
    <div class="ai-block-footer" v-if="editor?.isEditable">
      <button class="ai-cancel-btn" @click="handleCancel" title="取消 AI 模块（保留内容）">
        <Icon icon="mdi:close" />
      </button>
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { NodeViewWrapper, NodeViewContent, nodeViewProps } from '@tiptap/vue-3'
import { Icon } from '@/components/Icon'
import { computed } from 'vue'

const props = defineProps(nodeViewProps)

const selected = computed(() => props.selected)
const editor = computed(() => props.editor)

const handleCancel = () => {
  if (!props.editor) return
  props.editor.commands.unsetAIBlock()
}
</script>

<style lang="scss" scoped>
.ai-block-wrapper {
  position: relative;
  display: block;
  width: 100%;
  margin: 8px 0;
  padding: 0;
  border: 1px solid #e8a849;
  border-radius: 4px;
  background-color: #fff;
  transition: all 0.2s ease;

  &:hover {
    border-color: #d49a3a;
    box-shadow: 0 2px 8px rgba(232, 168, 73, 0.15);
  }

  &.is-selected {
    border-color: #c78c2e;
    box-shadow: 0 2px 12px rgba(232, 168, 73, 0.25);
  }
}

.ai-cancel-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #9ca3af;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;

  &:hover {
    background: #fee2e2;
    border-color: #fca5a5;
    color: #dc2626;
  }

  :deep(svg) {
    width: 14px;
    height: 14px;
  }
}

.ai-block-content {
  padding: 12px 16px;
  min-height: 40px;

  :deep(p) {
    margin: 0.5em 0;
    line-height: 1.75;
    text-indent: 2em;

    &:first-child {
      margin-top: 0;
    }

    &:last-child {
      margin-bottom: 0;
    }
  }

  :deep(strong),
  :deep(b) {
    font-weight: 700;
    color: #333;
  }

  :deep(ul),
  :deep(ol) {
    margin: 0.5em 0;
    padding-left: 1.5em;
  }

  :deep(li) {
    margin: 0.25em 0;
    text-indent: 0;
  }

  :deep(blockquote) {
    margin: 0.5em 0;
    padding-left: 1em;
    border-left: 3px solid #e8a849;
    color: #78716c;
  }
}

.ai-block-footer {
  position: absolute;
  top: 4px;
  right: 4px;
}
</style>
