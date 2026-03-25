<template>
  <BubbleMenu
    v-if="editor"
    :editor="editor"
    :tippy-options="tippyOptions"
    :should-show="shouldShow"
    class="table-bubble-menu"
  >
    <div class="table-bubble-toolbar">
      <!-- 对齐方式 -->
      <el-popover placement="bottom" :width="120" trigger="click" :teleported="false">
        <template #reference>
          <button class="tb-btn" :disabled="!isInTable" title="对齐方式">
            <Icon icon="mdi:format-align-center" />
            <Icon icon="mdi:chevron-down" class="tb-arrow" />
          </button>
        </template>
        <div class="tb-align-panel">
          <button
            v-for="a in alignOptions"
            :key="a.value"
            class="tb-align-item"
            @click="setCellAlign(a.value)"
          >
            <Icon :icon="a.icon" />
            <span>{{ a.label }}</span>
          </button>
        </div>
      </el-popover>

      <!-- 背景颜色 -->
      <ColorPicker
        v-model="currentCellBg"
        icon="mdi:format-color-fill"
        title="背景颜色"
        @change="setCellBg"
      />

      <span class="tb-divider"></span>

      <button class="tb-btn" :disabled="!isInTable" title="插入行(前)" @click="cmd('addRowBefore')">
        <Icon icon="mdi:table-row-plus-before" />
      </button>
      <button class="tb-btn" :disabled="!isInTable" title="插入行(后)" @click="cmd('addRowAfter')">
        <Icon icon="mdi:table-row-plus-after" />
      </button>
      <button class="tb-btn" :disabled="!isInTable" title="删除行" @click="cmd('deleteRow')">
        <Icon icon="mdi:table-row-remove" />
      </button>

      <span class="tb-divider"></span>

      <button class="tb-btn" :disabled="!isInTable" title="插入列(左)" @click="cmd('addColumnBefore')">
        <Icon icon="mdi:table-column-plus-before" />
      </button>
      <button class="tb-btn" :disabled="!isInTable" title="插入列(右)" @click="cmd('addColumnAfter')">
        <Icon icon="mdi:table-column-plus-after" />
      </button>
      <button class="tb-btn" :disabled="!isInTable" title="删除列" @click="cmd('deleteColumn')">
        <Icon icon="mdi:table-column-remove" />
      </button>

      <span class="tb-divider"></span>

      <button class="tb-btn" :disabled="!canMerge" title="合并单元格" @click="cmd('mergeCells')">
        <Icon icon="mdi:table-merge-cells" />
      </button>
      <button class="tb-btn" :disabled="!canSplit" title="拆分单元格" @click="cmd('splitCell')">
        <Icon icon="mdi:table-split-cell" />
      </button>

      <span class="tb-divider"></span>

      <button class="tb-btn" :disabled="!isInTable" title="切换表头行" @click="cmd('toggleHeaderRow')">
        <Icon icon="mdi:table-headers-eye" />
      </button>
      <button class="tb-btn" :disabled="!isInTable" title="切换表头列" @click="cmd('toggleHeaderColumn')">
        <Icon icon="mdi:table-headers-eye-off" />
      </button>

      <span class="tb-divider"></span>

      <button class="tb-btn tb-btn-danger" :disabled="!isInTable" title="删除表格" @click="cmd('deleteTable')">
        <Icon icon="mdi:table-remove" />
      </button>
    </div>
  </BubbleMenu>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, computed } from 'vue'
import { BubbleMenu } from '@tiptap/vue-3/menus'
import { CellSelection } from '@tiptap/pm/tables'
import { Icon } from '@/components/Icon'
import ColorPicker from './ColorPicker.vue'
import type { Editor } from '@tiptap/core'

const props = defineProps<{
  editor: Editor
  editable: boolean
}>()

const tippyOptions = {
  placement: 'top-start' as const,
  maxWidth: 'none' as const,
  offset: [0, 8] as [number, number],
  zIndex: 50
}

const shouldShow = ({ state }: { state: any }) => {
  if (!props.editable) return false
  const { selection } = state
  if (selection instanceof CellSelection) return true
  return props.editor.isActive('table') && selection.empty
}

const isInTable = computed(() => props.editor?.isActive('table') || false)
const canMerge = computed(() => isInTable.value && props.editor?.can().mergeCells())
const canSplit = computed(() => isInTable.value && props.editor?.can().splitCell())

const cmd = (command: string) => {
  if (!props.editor) return
  ;(props.editor.chain().focus() as any)[command]().run()
}

const setCellAlign = (align: string) => {
  props.editor?.chain().focus().setCellAttribute('textAlign', align).run()
}

const currentCellBg = ref('')

const setCellBg = (color: string) => {
  currentCellBg.value = color
  props.editor?.chain().focus().setCellAttribute('backgroundColor', color || null).run()
}

const alignOptions = [
  { label: '左对齐', value: 'left', icon: 'mdi:format-align-left' },
  { label: '居中', value: 'center', icon: 'mdi:format-align-center' },
  { label: '右对齐', value: 'right', icon: 'mdi:format-align-right' }
]
</script>

<style lang="scss" scoped>
.table-bubble-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 8px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  flex-wrap: wrap;
  max-width: 520px;
}

.tb-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: #374151;
  font-size: 16px;
  padding: 0;
  transition: background 0.15s;

  &:hover:not(:disabled) {
    background: #f3f4f6;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .tb-arrow {
    font-size: 12px;
    margin-left: -4px;
  }
}

.tb-btn-danger {
  color: #ef4444;
  &:hover:not(:disabled) {
    background: #fef2f2;
  }
}

.tb-divider {
  width: 1px;
  height: 20px;
  background: #e5e7eb;
  margin: 0 4px;
}

.tb-align-panel {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tb-align-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: #374151;
  width: 100%;
  text-align: left;

  &:hover {
    background: #f3f4f6;
  }
}

.tb-color-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tb-color-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
}

.tb-color-item {
  width: 32px;
  height: 24px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  cursor: pointer;
  padding: 0;

  &:hover {
    border-color: #409eff;
    transform: scale(1.1);
  }
}

.tb-color-clear {
  border: none;
  background: transparent;
  color: #6b7280;
  font-size: 12px;
  cursor: pointer;
  padding: 4px 0;
  text-align: center;

  &:hover {
    color: #409eff;
  }
}
</style>
