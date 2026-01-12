<template>
  <div class="table-toolbar">
    <!-- 插入表格 -->
    <div class="toolbar-group">
      <el-popover placement="bottom" :width="280" trigger="click">
        <template #reference>
          <span>
            <el-tooltip content="插入表格" placement="bottom" :show-after="500">
              <button class="toolbar-btn-large">
                <Icon icon="mdi:table-plus" class="btn-icon-large" />
                <span class="btn-text">插入表格</span>
              </button>
            </el-tooltip>
          </span>
        </template>
        <div class="table-picker">
          <div class="picker-header">选择表格大小</div>
          <div class="table-grid" @mouseleave="resetTableSize">
            <div v-for="row in 8" :key="row" class="table-row">
              <div
                v-for="col in 10"
                :key="col"
                class="table-cell"
                :class="{ active: row <= hoverRows && col <= hoverCols }"
                @mouseenter="setTableSize(row, col)"
                @click="insertTable(hoverRows, hoverCols)"
              ></div>
            </div>
          </div>
          <div class="picker-footer">{{ hoverRows }} x {{ hoverCols }}</div>
        </div>
      </el-popover>
    </div>

    <!-- 修复表格 -->
    <div class="toolbar-group">
      <el-tooltip content="修复表格" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" :disabled="!isInTable" @click="fixTable">
          <Icon icon="mdi:wrench-outline" class="btn-icon-large" />
          <span class="btn-text">修复</span>
        </button>
      </el-tooltip>
    </div>

    <div class="toolbar-divider"></div>

    <!-- 对齐方式 -->
    <div class="toolbar-group">
      <el-popover placement="bottom" :width="160" trigger="click">
        <template #reference>
          <span>
            <el-tooltip content="对齐方式" placement="bottom" :show-after="500">
              <button class="toolbar-btn-large" :disabled="!isInTable">
                <Icon icon="mdi:format-align-center" class="btn-icon-large" />
                <span class="btn-text">对齐方式</span>
              </button>
            </el-tooltip>
          </span>
        </template>
        <div class="align-panel">
          <div
            v-for="align in alignOptions"
            :key="align.value"
            class="align-item"
            @click="setTableAlign(align.value)"
          >
            <Icon :icon="align.icon" class="align-icon" />
            <span>{{ align.label }}</span>
          </div>
        </div>
      </el-popover>
    </div>

    <!-- 背景颜色 -->
    <div class="toolbar-group">
      <el-popover placement="bottom" :width="280" trigger="click">
        <template #reference>
          <span>
            <el-tooltip content="背景颜色" placement="bottom" :show-after="500">
              <button class="toolbar-btn-large" :disabled="!isInTable">
                <Icon icon="mdi:format-color-fill" class="btn-icon-large" />
                <span class="btn-text">背景颜色</span>
              </button>
            </el-tooltip>
          </span>
        </template>
        <div class="color-panel">
          <div class="color-grid">
            <button
              v-for="color in cellColors"
              :key="color"
              class="color-item"
              :style="{ backgroundColor: color }"
              @click="setCellBackground(color)"
            >
              <Icon v-if="color === currentCellBg" icon="ep:check" class="check-icon" />
            </button>
          </div>
          <div class="color-actions">
            <el-button text size="small" @click="setCellBackground('')">清除背景</el-button>
          </div>
        </div>
      </el-popover>
    </div>

    <div class="toolbar-divider"></div>

    <!-- 行操作 -->
    <div class="toolbar-group">
      <el-tooltip content="插入行(前)" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" :disabled="!isInTable" @click="addRowBefore">
          <Icon icon="mdi:table-row-plus-before" class="btn-icon-large" />
          <span class="btn-text">插入行(前)</span>
        </button>
      </el-tooltip>
      <el-tooltip content="插入行(后)" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" :disabled="!isInTable" @click="addRowAfter">
          <Icon icon="mdi:table-row-plus-after" class="btn-icon-large" />
          <span class="btn-text">插入行(后)</span>
        </button>
      </el-tooltip>
      <el-tooltip content="删除行" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" :disabled="!isInTable" @click="deleteRow">
          <Icon icon="mdi:table-row-remove" class="btn-icon-large" />
          <span class="btn-text">删除行</span>
        </button>
      </el-tooltip>
    </div>

    <div class="toolbar-divider"></div>

    <!-- 列操作 -->
    <div class="toolbar-group">
      <el-tooltip content="插入列(左)" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" :disabled="!isInTable" @click="addColumnBefore">
          <Icon icon="mdi:table-column-plus-before" class="btn-icon-large" />
          <span class="btn-text">插入列(左)</span>
        </button>
      </el-tooltip>
      <el-tooltip content="插入列(右)" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" :disabled="!isInTable" @click="addColumnAfter">
          <Icon icon="mdi:table-column-plus-after" class="btn-icon-large" />
          <span class="btn-text">插入列(右)</span>
        </button>
      </el-tooltip>
      <el-tooltip content="删除列" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" :disabled="!isInTable" @click="deleteColumn">
          <Icon icon="mdi:table-column-remove" class="btn-icon-large" />
          <span class="btn-text">删除列</span>
        </button>
      </el-tooltip>
    </div>

    <div class="toolbar-divider"></div>

    <!-- 合并/拆分单元格 -->
    <div class="toolbar-group">
      <el-tooltip content="合并单元格" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" :disabled="!canMerge" @click="mergeCells">
          <Icon icon="mdi:table-merge-cells" class="btn-icon-large" />
          <span class="btn-text">合并单元格</span>
        </button>
      </el-tooltip>
      <el-tooltip content="拆分单元格" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" :disabled="!canSplit" @click="splitCell">
          <Icon icon="mdi:table-split-cell" class="btn-icon-large" />
          <span class="btn-text">拆分单元格</span>
        </button>
      </el-tooltip>
    </div>

    <div class="toolbar-divider"></div>

    <!-- 表头操作 -->
    <div class="toolbar-group">
      <el-tooltip content="切换表头行" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" :disabled="!isInTable" @click="toggleHeaderRow">
          <Icon icon="mdi:table-headers-eye" class="btn-icon-large" />
          <span class="btn-text">切换表头行</span>
        </button>
      </el-tooltip>
      <el-tooltip content="切换表头列" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" :disabled="!isInTable" @click="toggleHeaderColumn">
          <Icon icon="mdi:table-headers-eye-off" class="btn-icon-large" />
          <span class="btn-text">切换表头列</span>
        </button>
      </el-tooltip>
      <el-tooltip content="切换表头单元格" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" :disabled="!isInTable" @click="toggleHeaderCell">
          <Icon icon="mdi:table-eye" class="btn-icon-large" />
          <span class="btn-text">切换表头单元格</span>
        </button>
      </el-tooltip>
    </div>

    <div class="toolbar-divider"></div>

    <!-- 单元格导航 -->
    <div class="toolbar-group">
      <el-tooltip content="下一个单元格" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" :disabled="!isInTable" @click="goToNextCell">
          <Icon icon="mdi:arrow-right-box" class="btn-icon-large" />
          <span class="btn-text">下一个单元格</span>
        </button>
      </el-tooltip>
      <el-tooltip content="上一个单元格" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" :disabled="!isInTable" @click="goToPreviousCell">
          <Icon icon="mdi:arrow-left-box" class="btn-icon-large" />
          <span class="btn-text">上一个单元格</span>
        </button>
      </el-tooltip>
    </div>

    <div class="toolbar-divider"></div>

    <!-- 删除表格 -->
    <div class="toolbar-group">
      <el-tooltip content="删除表格" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large danger" :disabled="!isInTable" @click="deleteTable">
          <Icon icon="mdi:table-remove" class="btn-icon-large" />
          <span class="btn-text">删除表格</span>
        </button>
      </el-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck - 忽略 Tiptap 扩展类型问题
import { ref, computed } from 'vue'
import { Icon } from '@/components/Icon'
import { useEditor } from './useEditor'

// 获取编辑器实例
const editor = useEditor()

// 表格选择器状态
const hoverRows = ref(3)
const hoverCols = ref(3)

// 单元格背景色
const currentCellBg = ref('')

// 对齐选项
const alignOptions = [
  { label: '左对齐', value: 'left', icon: 'mdi:format-align-left' },
  { label: '居中', value: 'center', icon: 'mdi:format-align-center' },
  { label: '右对齐', value: 'right', icon: 'mdi:format-align-right' }
]

// 单元格颜色
const cellColors = [
  '#FFFFFF',
  '#F5F5F5',
  '#E0E0E0',
  '#BDBDBD',
  '#9E9E9E',
  '#FFF3E0',
  '#FFE0B2',
  '#FFCC80',
  '#FFB74D',
  '#FFA726',
  '#E3F2FD',
  '#BBDEFB',
  '#90CAF9',
  '#64B5F6',
  '#42A5F5',
  '#E8F5E9',
  '#C8E6C9',
  '#A5D6A7',
  '#81C784',
  '#66BB6A',
  '#FCE4EC',
  '#F8BBD9',
  '#F48FB1',
  '#F06292',
  '#EC407A',
  '#F3E5F5',
  '#E1BEE7',
  '#CE93D8',
  '#BA68C8',
  '#AB47BC',
  '#FFF8E1',
  '#FFECB3',
  '#FFE082',
  '#FFD54F',
  '#FFCA28',
  '#E8EAF6',
  '#C5CAE9',
  '#9FA8DA',
  '#7986CB',
  '#5C6BC0'
]

// 计算属性
const isInTable = computed(() => {
  return editor.value?.isActive('table') || false
})

const canMerge = computed(() => {
  return isInTable.value && editor.value?.can().mergeCells()
})

const canSplit = computed(() => {
  return isInTable.value && editor.value?.can().splitCell()
})

// 方法
const setTableSize = (rows: number, cols: number) => {
  hoverRows.value = rows
  hoverCols.value = cols
}

const resetTableSize = () => {
  hoverRows.value = 3
  hoverCols.value = 3
}

const insertTable = (rows: number, cols: number) => {
  if (!editor.value) return
  editor.value.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
}

const fixTable = () => {
  if (!editor.value) return
  editor.value.chain().focus().fixTables().run()
}

const setTableAlign = (align: string) => {
  if (!editor.value) return
  // 使用自定义 TableCell 扩展的 textAlign 属性
  editor.value.chain().focus().setCellAttribute('textAlign', align).run()
}

const setCellBackground = (color: string) => {
  if (!editor.value) return
  currentCellBg.value = color
  if (color) {
    editor.value.chain().focus().setCellAttribute('backgroundColor', color).run()
  } else {
    editor.value.chain().focus().setCellAttribute('backgroundColor', null).run()
  }
}

const addRowBefore = () => {
  if (!editor.value) return
  editor.value.chain().focus().addRowBefore().run()
}

const addRowAfter = () => {
  if (!editor.value) return
  editor.value.chain().focus().addRowAfter().run()
}

const deleteRow = () => {
  if (!editor.value) return
  editor.value.chain().focus().deleteRow().run()
}

const addColumnBefore = () => {
  if (!editor.value) return
  editor.value.chain().focus().addColumnBefore().run()
}

const addColumnAfter = () => {
  if (!editor.value) return
  editor.value.chain().focus().addColumnAfter().run()
}

const deleteColumn = () => {
  if (!editor.value) return
  editor.value.chain().focus().deleteColumn().run()
}

const mergeCells = () => {
  if (!editor.value) return
  editor.value.chain().focus().mergeCells().run()
}

const splitCell = () => {
  if (!editor.value) return
  editor.value.chain().focus().splitCell().run()
}

const toggleHeaderRow = () => {
  if (!editor.value) return
  editor.value.chain().focus().toggleHeaderRow().run()
}

const toggleHeaderColumn = () => {
  if (!editor.value) return
  editor.value.chain().focus().toggleHeaderColumn().run()
}

const toggleHeaderCell = () => {
  if (!editor.value) return
  editor.value.chain().focus().toggleHeaderCell().run()
}

const goToNextCell = () => {
  if (!editor.value) return
  editor.value.chain().focus().goToNextCell().run()
}

const goToPreviousCell = () => {
  if (!editor.value) return
  editor.value.chain().focus().goToPreviousCell().run()
}

const deleteTable = () => {
  if (!editor.value) return
  editor.value.chain().focus().deleteTable().run()
}
</script>

<style lang="scss" scoped>
.table-toolbar {
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

  &:hover:not(:disabled) {
    background: #e8f0fe;
    color: #1a73e8;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &.danger:hover:not(:disabled) {
    background: #fff1f0;
    color: #ff4d4f;
  }

  .btn-icon-large {
    font-size: 22px;
  }

  .btn-text {
    font-size: 11px;
  }
}

.table-picker {
  .picker-header {
    font-size: 13px;
    color: #666;
    margin-bottom: 12px;
    text-align: center;
  }

  .table-grid {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 4px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    background: #fafafa;

    .table-row {
      display: flex;
      gap: 3px;
    }

    .table-cell {
      width: 22px;
      height: 22px;
      border: 1px solid #d0d0d0;
      border-radius: 2px;
      background: #fff;
      cursor: pointer;
      transition: all 0.1s ease;

      &.active {
        background: #1a73e8;
        border-color: #1a73e8;
      }
    }
  }

  .picker-footer {
    text-align: center;
    margin-top: 8px;
    font-size: 13px;
    color: #1a73e8;
    font-weight: 500;
  }
}

.align-panel {
  .align-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.15s ease;

    &:hover {
      background: #e8f0fe;
    }

    .align-icon {
      font-size: 18px;
      color: #666;
    }

    span {
      font-size: 13px;
    }
  }
}

.color-panel {
  .color-grid {
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    gap: 4px;

    .color-item {
      width: 22px;
      height: 22px;
      border: 1px solid #e0e0e0;
      border-radius: 3px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;

      &:hover {
        transform: scale(1.15);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      }

      .check-icon {
        font-size: 12px;
        color: #333;
      }
    }
  }

  .color-actions {
    margin-top: 12px;
    text-align: right;
  }
}
</style>
