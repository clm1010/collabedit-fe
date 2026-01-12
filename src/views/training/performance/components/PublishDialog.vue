<template>
  <el-dialog
    v-model="dialogVisible"
    title="发布配置"
    width="600px"
    :close-on-click-modal="false"
    class="custom-dialog-header"
  >
    <el-form ref="formRef" :model="formData" label-width="100px">
      <el-form-item label="可见范围">
        <el-select v-model="formData.visibleScope" multiple placeholder="请选择" class="w-full">
          <el-option v-for="u in userOptions" :key="u.value" :label="u.label" :value="u.value" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button type="primary" @click="handleSubmit" :loading="loading">确认提交</el-button>
      <el-button @click="dialogVisible = false">取消</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'

// Props
interface Props {
  visible: boolean
  loading: boolean
  userOptions: { label: string; value: string }[]
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'submit', visibleScope: string[]): void
}>()

// 双向绑定 visible
const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

// 表单数据
const formRef = ref()
const formData = reactive({
  visibleScope: [] as string[]
})

// 提交
const handleSubmit = () => {
  emit('submit', [...formData.visibleScope])
}

// 重置表单（弹窗打开时设置默认值）
const setDefaultScope = (scope: string[]) => {
  formData.visibleScope = scope
}

// 暴露方法
defineExpose({
  setDefaultScope
})
</script>
