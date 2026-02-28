<template>
  <el-dialog
    v-model="dialogVisible"
    title="自定义要素"
    width="700px"
    :close-on-click-modal="false"
    destroy-on-close
    class="custom-dialog-header"
  >
    <div class="flex justify-center mb-4">
      <el-button type="primary" link @click="handleAddElement">
        <Icon icon="ep:plus" class="mr-1" />
        添加要素
      </el-button>
    </div>

    <div class="elements-table">
      <div class="table-header">
        <div class="col-type">类型</div>
        <div class="col-label">要素</div>
        <div class="col-action">操作</div>
      </div>

      <div v-if="elementsList.length > 0" class="table-body">
        <div v-for="(item, index) in elementsList" :key="index" class="table-row">
          <div class="col-type">
            <el-select
              v-model="item.item_type"
              placeholder="请选择"
              class="w-full"
              @change="handleTypeChange(item)"
            >
              <el-option
                v-for="opt in ELEMENT_TYPE_OPTIONS"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </div>

          <div class="col-label">
            <el-input v-model="item.item_label" placeholder="请输入文本" clearable />
            <el-input
              v-if="needOptions(item.item_type)"
              v-model="item._optionsStr"
              placeholder="配置选项，用英文逗号分隔"
              class="mt-2"
              clearable
              @blur="handleOptionsBlur(item)"
            />
          </div>

          <div class="col-action">
            <el-button type="danger" link @click="handleDeleteElement(index)">
              <Icon icon="ep:delete" />
            </el-button>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <span class="text-gray-400">暂无要素，请点击上方按钮添加</span>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" @click="handleConfirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Icon } from '@/components/Icon'
import { ELEMENT_TYPE_OPTIONS, needOptions } from '@/utils/tmmConstants'
import type { ElementItem } from '@/types/management'

interface Props {
  modelValue: boolean
  elements?: ElementItem[]
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  elements: () => []
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', elements: ElementItem[]): void
}>()

interface InternalElementItem extends ElementItem {
  _optionsStr?: string
}

const elementsList = ref<InternalElementItem[]>([])

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

watch(
  () => props.elements,
  (newVal) => {
    if (newVal && newVal.length > 0) {
      elementsList.value = newVal.map((item) => ({
        ...item,
        _optionsStr: item.item_options?.join(',') || ''
      }))
    } else {
      elementsList.value = []
    }
  },
  { immediate: true, deep: true }
)

const handleAddElement = () => {
  elementsList.value.push({
    item_type: 'text',
    item_label: '',
    item_options: [],
    _optionsStr: ''
  })
}

const handleDeleteElement = (index: number) => {
  elementsList.value.splice(index, 1)
}

const handleTypeChange = (item: InternalElementItem) => {
  if (!needOptions(item.item_type)) {
    item.item_options = []
    item._optionsStr = ''
  }
}

const handleOptionsBlur = (item: InternalElementItem) => {
  if (item._optionsStr) {
    item.item_options = item._optionsStr
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s)
  } else {
    item.item_options = []
  }
}

const handleCancel = () => {
  dialogVisible.value = false
}

const handleConfirm = () => {
  const result: ElementItem[] = elementsList.value.map((item) => {
    const element: ElementItem = {
      item_type: item.item_type,
      item_label: item.item_label
    }
    if (needOptions(item.item_type) && item._optionsStr) {
      element.item_options = item._optionsStr
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s)
    }
    return element
  })

  emit('confirm', result)
  dialogVisible.value = false
}
</script>

<style scoped lang="scss">
.elements-table {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  overflow: hidden;
}

.table-header {
  display: flex;
  background-color: #fafafa;
  border-bottom: 1px solid #ebeef5;
  padding: 12px 16px;
  font-weight: 500;
  color: #606266;
}

.table-body {
  max-height: 400px;
  overflow-y: auto;
}

.table-row {
  display: flex;
  padding: 12px 16px;
  border-bottom: 1px solid #ebeef5;
  align-items: flex-start;

  &:last-child {
    border-bottom: none;
  }
}

.col-type {
  width: 120px;
  flex-shrink: 0;
}

.col-label {
  flex: 1;
  padding: 0 16px;
}

.col-action {
  width: 60px;
  flex-shrink: 0;
  text-align: center;
}

.empty-state {
  padding: 40px;
  text-align: center;
}
</style>

<style lang="scss">
.el-dialog.custom-dialog-header {
  padding: 0;

  .el-dialog__header {
    background: linear-gradient(102.53deg, #1677ff1a 0.03%, #1677ff26 102.41%);
    padding: 20px 24px;
    margin: 0;
    border-bottom: 1px solid #1677ff1a;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .el-dialog__title {
    font-size: 18px;
    font-weight: 600;
    color: #303133;
    line-height: 1;
  }

  .el-dialog__headerbtn {
    position: static;
    width: 24px;
    height: 24px;
    margin: 0;

    .el-dialog__close {
      color: #909399;
      font-size: 20px;

      &:hover {
        color: #606266;
      }
    }
  }

  .el-dialog__body {
    padding: 24px;
  }

  .el-dialog__footer {
    padding: 16px 24px;
    border-top: 1px solid #e4e7ed;
    margin: 0;
  }
}
</style>
