<template>
  <el-dialog
    v-model="dialogVisible"
    title="审核流配置"
    width="600px"
    :close-on-click-modal="false"
    class="custom-dialog-header"
    @close="handleClose"
  >
    <el-form ref="formRef" :model="formData" label-width="100px">
      <el-form-item label="流程名称">
        <el-select
          v-model="formData.selectedFlowId"
          placeholder="请选择流程"
          class="w-full"
          @change="handleFlowChange"
        >
          <el-option
            v-for="item in flowList"
            :key="item.flowId"
            :label="item.flowName"
            :value="item.flowId"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="审核人">
        <div class="border p-4 rounded w-full bg-gray-50">
          <template v-if="currentFlowNodes.length > 0">
            <el-row
              v-for="(node, index) in currentFlowNodes"
              :key="node.nodeId"
              :gutter="10"
              :class="{ 'mb-2': index < currentFlowNodes.length - 1 }"
            >
              <el-col :span="4" class="text-right leading-8">{{ node.nodeName }}</el-col>
              <el-col :span="20">
                <el-select
                  v-model="formData.auditors[node.nodeId]"
                  multiple
                  placeholder="请选择审核人"
                  class="w-full"
                >
                  <el-option
                    v-for="u in userOptions"
                    :key="u.value"
                    :label="u.label"
                    :value="u.value"
                  />
                </el-select>
              </el-col>
            </el-row>
          </template>
          <div v-else class="text-gray-400 text-center py-4">请先选择流程名称</div>
        </div>
      </el-form-item>
      <el-form-item label="审核说明">
        <el-input v-model="formData.comment" type="textarea" :rows="4" placeholder="请输入" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button type="primary" @click="handleSubmit" :loading="loading">确认提交</el-button>
      <el-button @click="handleClose">取消</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'

/**
 * 审核流配置弹窗组件
 * 通用组件，用于演训方案和模板管理的提交审核功能
 */

interface AuditFlowNode {
  nodeId: string
  nodeName: string
  users: string[] // 默认用户
}

interface AuditFlowItem {
  flowId: string
  flowName: string
  nodes: AuditFlowNode[]
}

interface Props {
  modelValue: boolean // 弹窗可见性 (v-model)
  documentId: number | string // 文档/模板 ID
  flowList?: AuditFlowItem[] // 审核流程列表
  userOptions?: { label: string; value: string }[] // 用户选项列表
  loading?: boolean // 加载状态
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  flowList: () => [
    {
      flowId: 'flow1',
      flowName: '文档审批流1',
      nodes: [
        { nodeId: 'node1', nodeName: '节点1', users: [] },
        { nodeId: 'node2', nodeName: '节点2', users: ['user1', 'user2'] },
        { nodeId: 'node3', nodeName: '节点3', users: ['user5'] },
        { nodeId: 'node4', nodeName: '节点4', users: ['user4'] }
      ]
    },
    {
      flowId: 'flow2',
      flowName: '文档审批流2',
      nodes: [
        { nodeId: 'node1', nodeName: '节点1', users: [] },
        { nodeId: 'node2', nodeName: '节点2', users: [] }
      ]
    }
  ],
  userOptions: () => [
    { label: 'user1', value: 'user1' },
    { label: 'user2', value: 'user2' },
    { label: 'user3', value: 'user3' },
    { label: 'user4', value: 'user4' },
    { label: 'user5', value: 'user5' }
  ]
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [
    data: {
      id: number | string
      flowId: string
      auditors: Record<string, string[]>
      comment: string
    }
  ]
  close: []
}>()

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const formRef = ref()

const formData = reactive({
  selectedFlowId: '', // 当前选中的流程ID
  comment: '',
  auditors: {} as Record<string, string[]> // 节点审核人 { node1: ['user1'], node2: ['user2'] }
})

const currentFlowNodes = computed(() => {
  if (!formData.selectedFlowId) return []
  const flow = props.flowList.find((f) => f.flowId === formData.selectedFlowId)
  return flow?.nodes || []
})

const handleFlowChange = (flowId: string) => {
  formData.auditors = {}
  const flow = props.flowList.find((f) => f.flowId === flowId)
  if (flow) {
    flow.nodes.forEach((node) => {
      formData.auditors[node.nodeId] = [...node.users]
    })
  }
}

const resetForm = () => {
  formData.selectedFlowId = ''
  formData.auditors = {}
  formData.comment = ''
}

const handleClose = () => {
  resetForm()
  emit('update:modelValue', false)
  emit('close')
}

const handleSubmit = () => {
  if (!formData.selectedFlowId) {
    ElMessage.warning('请选择流程名称')
    return
  }

  const hasAuditors = Object.values(formData.auditors).some((users) => users && users.length > 0)
  if (!hasAuditors) {
    ElMessage.warning('请至少为一个节点选择审核人')
    return
  }

  emit('submit', {
    id: props.documentId,
    flowId: formData.selectedFlowId,
    auditors: { ...formData.auditors },
    comment: formData.comment
  })
}

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      resetForm()
    }
  }
)

defineExpose({
  resetForm
})
</script>

<style lang="scss">
@use '@/lmStyles/dialog.scss';
</style>
