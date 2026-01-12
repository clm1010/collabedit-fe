<template>
  <el-dialog
    v-model="dialogVisible"
    title="审核记录"
    width="900px"
    :close-on-click-modal="false"
    class="custom-dialog-header"
  >
    <el-table
      v-loading="loading"
      :data="recordList"
      border
      stripe
      style="width: 100%"
      max-height="400px"
    >
      <el-table-column prop="examNode" label="审核节点" width="100" align="center" />
      <el-table-column prop="examResult" label="审核结果" width="100" align="center">
        <template #default="scope">
          <el-tag :type="scope.row.examResult === '1' ? 'success' : 'danger'">
            {{ scope.row.examResult === '1' ? '通过' : '驳回' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="examOpinion"
        label="审核意见"
        min-width="200"
        align="left"
        show-overflow-tooltip
      />
      <el-table-column prop="examOfficeName" label="审核部门" width="120" align="center" />
      <el-table-column prop="examUserId" label="审批用户" width="100" align="center" />
      <el-table-column prop="nextUserId" label="下一审批人" width="100" align="center" />
      <el-table-column prop="createTime" label="审核时间" width="160" align="center" />
    </el-table>
    <template #footer>
      <el-button @click="dialogVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ExamRecordVO } from '@/api/training'

// Props
interface Props {
  visible: boolean
  loading: boolean
  recordList: ExamRecordVO[]
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
}>()

// 双向绑定 visible
const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})
</script>
