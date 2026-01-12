<template>
  <el-dialog
    v-model="dialogVisible"
    title="驳回原因"
    width="500px"
    :close-on-click-modal="false"
    append-to-body
    class="custom-dialog-header"
  >
    <el-form label-position="top">
      <el-form-item label="请输入驳回原因" required>
        <el-input
          v-model="reason"
          type="textarea"
          :rows="6"
          placeholder="请输入驳回原因"
          resize="none"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleSubmit" :loading="loading">确认提交</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// Props
interface Props {
  visible: boolean
  loading: boolean
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'submit', reason: string): void
}>()

// 双向绑定 visible
const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

// 驳回原因
const reason = ref('')

// 提交
const handleSubmit = () => {
  emit('submit', reason.value)
}

// 重置
const reset = () => {
  reason.value = ''
}

// 暴露方法
defineExpose({
  reset
})
</script>
