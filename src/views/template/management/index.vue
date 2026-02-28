<template>
  <div class="template-management">
    <ContentWrap class="flex-shrink-0">
      <el-form
        class="-mb-15px"
        :model="queryParams"
        ref="queryFormRef"
        :inline="true"
        label-width="100px"
      >
        <el-form-item label="创建时间" prop="createTime">
          <el-date-picker
            v-model="createTimeRange"
            type="daterange"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DD"
            class="!w-280px"
          />
        </el-form-item>
        <el-form-item label="模板名称" prop="templateName">
          <el-input
            v-model="queryParams.templateName"
            placeholder="请输入"
            clearable
            class="!w-200px"
          />
        </el-form-item>
        <el-form-item label="模板分类" prop="temCategory">
          <el-select
            v-model="queryParams.temCategory"
            placeholder="请选择"
            clearable
            class="!w-200px"
          >
            <el-option
              v-for="item in templateCategories"
              :key="item.id"
              :label="item.name"
              :value="item.name"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="模板子类" prop="temSubclass">
          <el-select
            v-model="queryParams.temSubclass"
            placeholder="模板子类"
            clearable
            class="!w-150px"
          >
            <el-option
              v-for="item in subClassOptions"
              :key="item.category_id"
              :label="item.category_name"
              :value="item.category_id"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery">
            <Icon icon="ep:search" class="mr-1" />
            查询
          </el-button>
          <el-button @click="resetQuery">
            <Icon icon="ep:refresh" class="mr-1" />
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </ContentWrap>

    <ContentWrap class="flex-1 overflow-hidden mt-4 table-container-wrap">
      <div class="h-full flex flex-col p-4">
        <div class="mb-4 flex-shrink-0">
          <el-button type="primary" @click="handleAdd">
            <Icon icon="ep:plus" class="mr-1" />
            新建
          </el-button>
          <el-button type="danger" plain :disabled="!canBatchDelete" @click="handleBatchDelete">
            <Icon icon="ep:delete" class="mr-1" />
            批量删除 {{ selectedIds.length > 0 ? `(${selectedIds.length})` : '' }}
          </el-button>
        </div>

        <el-tabs v-model="activeTab" @tab-change="handleTabChange" class="flex-shrink-0">
          <el-tab-pane label="最近文档" name="recent" />
          <el-tab-pane label="审核列表" name="review" />
          <el-tab-pane label="文档发布" name="publish" />
        </el-tabs>

        <div class="flex-1 overflow-hidden">
          <el-table
            ref="tableRef"
            v-loading="loading"
            :data="list"
            stripe
            @selection-change="handleSelectionChange"
            height="100%"
          >
            <el-table-column type="selection" width="55" align="center" />
            <el-table-column label="序号" type="index" width="60" align="center" />
            <el-table-column label="模板名称" prop="templateName" align="center" min-width="150" />
            <el-table-column label="模板分类" prop="temCategory" align="center" min-width="120">
              <template #default>
                {{ templateCategories[0]?.name || '筹划文档' }}
              </template>
            </el-table-column>
            <el-table-column label="模板子类" prop="temSubclass" align="center" width="120">
              <template #default="scope">
                {{ getSubCategoryNameById(scope.row.temSubclass) || scope.row.temSubclass }}
              </template>
            </el-table-column>
            <el-table-column label="模板状态" prop="temStatus" align="center" width="100">
              <template #default="scope">
                <el-tag :type="getStatusType(scope.row.temStatus)">
                  {{ getStatusText(scope.row.temStatus) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="审核状态" prop="applyNode" align="center" width="120">
              <template #default="scope">
                <div class="flex items-center justify-center">
                  <div
                    :class="getApplyNodeClass(scope.row.applyNode)"
                    class="w-2 h-2 rounded-full mr-2"
                  ></div>
                  {{ getApplyNodeText(scope.row.applyNode) }}
                </div>
              </template>
            </el-table-column>
            <el-table-column
              label="描述"
              prop="description"
              align="center"
              min-width="150"
              show-overflow-tooltip
            />
            <el-table-column label="创建时间" prop="createTime" align="center" width="180" />
            <el-table-column label="创建人" prop="createBy" align="center" width="120" />
            <el-table-column label="操作" align="center" width="320" fixed="right">
              <template #default="scope">
                <!-- 编辑中状态(1)显示：编辑、写作、提交审核、删除 -->
                <template v-if="scope.row.applyNode === '1'">
                  <el-button link type="primary" @click="handleEditData(scope.row)">
                    <Icon icon="ep:edit-pen" />
                    编辑
                  </el-button>
                  <el-button link type="primary" @click="handleEdit(scope.row)">
                    <Icon icon="ep:edit" />
                    写作
                  </el-button>
                  <el-button link type="primary" @click="handleSubmitAudit(scope.row)">
                    <Icon icon="ep:upload" />
                    提交审核
                  </el-button>
                  <el-button link type="danger" @click="handleDelete(scope.row)">
                    <Icon icon="ep:delete" />
                    删除
                  </el-button>
                </template>

                <!-- 审核中状态(2)显示：审核执行、审核记录 -->
                <template v-else-if="scope.row.applyNode === '2'">
                  <el-button link type="primary" @click="handleReviewExecute(scope.row)">
                    <Icon icon="ep:view" />
                    审核执行
                  </el-button>
                  <el-button link type="primary" @click="openExamRecordDialog(scope.row)">
                    <Icon icon="ep:document" />
                    审核记录
                  </el-button>
                </template>

                <!-- 审核通过状态(3)显示：发布按钮 + 审核记录 -->
                <template v-else-if="scope.row.applyNode === '3'">
                  <el-button link type="primary" @click="openPublishDialog(scope.row)">
                    <Icon icon="ep:promotion" />
                    发布
                  </el-button>
                  <el-button link type="primary" @click="openExamRecordDialog(scope.row)">
                    <Icon icon="ep:document" />
                    审核记录
                  </el-button>
                </template>

                <!-- 发布状态(4)显示：预览、导出、审核记录 -->
                <template v-else-if="scope.row.applyNode === '4'">
                  <el-button link type="primary" @click="handlePreview(scope.row)">
                    <Icon icon="ep:view" />
                    预览
                  </el-button>
                  <el-button link type="primary" @click="handleExport(scope.row)">
                    <Icon icon="ep:download" />
                    导出
                  </el-button>
                  <el-button link type="primary" @click="openExamRecordDialog(scope.row)">
                    <Icon icon="ep:document" />
                    审核记录
                  </el-button>
                </template>

                <!-- 驳回状态(5)显示：编辑、写作、提交审核、删除、审核记录 -->
                <template v-else-if="scope.row.applyNode === '5'">
                  <el-button link type="primary" @click="handleEditData(scope.row)">
                    <Icon icon="ep:edit-pen" />
                    编辑
                  </el-button>
                  <el-button link type="primary" @click="handleEdit(scope.row)">
                    <Icon icon="ep:edit" />
                    写作
                  </el-button>
                  <el-button link type="primary" @click="handleSubmitAudit(scope.row)">
                    <Icon icon="ep:upload" />
                    提交审核
                  </el-button>
                  <el-button link type="danger" @click="handleDelete(scope.row)">
                    <Icon icon="ep:delete" />
                    删除
                  </el-button>
                  <el-button link type="primary" @click="openExamRecordDialog(scope.row)">
                    <Icon icon="ep:document" />
                    审核记录
                  </el-button>
                </template>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="mt-4 flex justify-between items-center flex-shrink-0">
          <div class="text-gray-500">共 {{ total }} 条</div>
          <Pagination
            :total="total"
            v-model:page="queryParams.pageNo"
            v-model:limit="queryParams.pageSize"
            @pagination="getList"
          />
        </div>
      </div>
    </ContentWrap>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      :close-on-click-modal="false"
      class="custom-dialog-header"
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="160px">
        <el-form-item label="模板名称" prop="templateName">
          <el-input v-model="formData.templateName" placeholder="请输入模板名称" clearable />
        </el-form-item>
        <el-form-item label="模板分类" prop="temCategory">
          <el-select v-model="formData.temCategory" placeholder="请选择" clearable class="w-full">
            <el-option
              v-for="item in templateCategories"
              :key="item.id"
              :label="item.name"
              :value="item.name"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="模板子类" prop="temSubclass">
          <el-select v-model="formData.temSubclass" placeholder="请选择" clearable class="w-full">
            <el-option
              v-for="item in subClassOptions"
              :key="item.category_id"
              :label="item.category_name"
              :value="item.category_id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="请输入描述"
          />
        </el-form-item>
        <el-form-item label="自定义要素">
          <div class="flex items-center gap-2">
            <el-button type="primary" link @click="elementsEditorVisible = true">
              <Icon icon="ep:setting" class="mr-1" />
              配置要素
            </el-button>
            <el-tag v-if="formData.elements_items.length > 0" type="info" size="small">
              已配置 {{ formData.elements_items.length }} 项
            </el-tag>
            <span v-else class="text-gray-400 text-sm">未配置</span>
          </div>
        </el-form-item>
        <el-form-item label="模板状态" prop="temStatus">
          <el-radio-group v-model="formData.temStatus">
            <el-radio value="0">启用</el-radio>
            <el-radio value="1">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="!isEditMode" label="创建方式" prop="creationMethod">
          <el-radio-group v-model="formData.creationMethod">
            <el-radio label="new">新建文档</el-radio>
            <el-radio label="upload">上传文档</el-radio>
          </el-radio-group>
        </el-form-item>

        <div v-if="!isEditMode && formData.creationMethod === 'upload'" class="pl-[100px] mt-4">
          <div class="flex items-start">
            <el-upload
              class="upload-demo w-full"
              drag
              action="#"
              :auto-upload="false"
              :file-list="uploadFileList"
              :on-change="handleFileChange"
              :on-remove="handleFileRemove"
              accept=".md"
            >
              <Icon icon="ep:upload-filled" class="el-icon--upload text-50px text-gray-400" />
              <div class="el-upload__text"> 将文件拖到此处，或 <em>点击上传</em> </div>
              <template #tip>
                <div class="el-upload__tip text-gray-400"> 支持 .md 格式文件 </div>
              </template>
            </el-upload>
          </div>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="submitLoading">确定</el-button>
      </template>
    </el-dialog>

    <AuditFlowDialog
      v-model="auditDialogVisible"
      :document-id="currentAuditId"
      :flow-list="auditFlowList"
      :user-options="userOptions"
      :loading="auditLoading"
      @submit="handleAuditSubmit"
    />

    <el-dialog
      v-model="rejectDialogVisible"
      title="驳回原因"
      width="500px"
      :close-on-click-modal="false"
      append-to-body
      class="custom-dialog-header"
    >
      <el-form label-position="top">
        <el-form-item label="请输入驳回原因" required>
          <el-input
            v-model="rejectReason"
            type="textarea"
            :rows="6"
            placeholder="请输入驳回原因"
            resize="none"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleRejectSubmit" :loading="rejectLoading"
          >确认提交</el-button
        >
      </template>
    </el-dialog>

    <el-dialog
      v-model="examRecordDialogVisible"
      title="审核记录"
      width="900px"
      :close-on-click-modal="false"
      class="custom-dialog-header"
    >
      <el-table
        v-loading="examRecordLoading"
        :data="examRecordList"
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
        <el-button @click="examRecordDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="publishDialogVisible"
      title="发布配置"
      width="600px"
      :close-on-click-modal="false"
      class="custom-dialog-header"
    >
      <el-form ref="publishFormRef" :model="publishFormData" label-width="100px">
        <el-form-item label="可见范围">
          <el-select
            v-model="publishFormData.visibleScope"
            multiple
            placeholder="请选择"
            class="w-full"
          >
            <el-option v-for="u in userOptions" :key="u.value" :label="u.label" :value="u.value" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button type="primary" @click="handlePublishSubmit" :loading="publishLoading"
          >确认提交</el-button
        >
        <el-button @click="publishDialogVisible = false">取消</el-button>
      </template>
    </el-dialog>

    <ElementsEditor
      v-model="elementsEditorVisible"
      :elements="formData.elements_items"
      @confirm="handleElementsConfirm"
    />

    <DocumentPreviewDialog
      v-model:visible="previewDialogVisible"
      :content="previewContent"
      :title="previewTitle"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted, onUnmounted, onActivated, computed } from 'vue'
import { useRouter } from 'vue-router'
import * as TemplateApi from '@/api/template'
import type { TemplateSubclassVO } from '@/types/management'
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus'
import { useCollaborationUserStore } from '@/store/modules/collaborationUser'
import { isEmpty, isNil, isString, isObject, pickBy, filter, map, every } from 'lodash-es'
import AuditFlowDialog from '@/lmComponents/AuditFlowDialog/index.vue'
import DocumentPreviewDialog from '@/lmComponents/DocumentPreviewDialog/index.vue'
import {
  blobToBase64,
  blobToText,
  addDocStreamSnapshot,
  computeSha256HexFromBlob,
  logDocStreamDebug
} from '@/views/utils/fileUtils'
import ElementsEditor from './components/ElementsEditor.vue'
import { markdownToHtml } from '@/views/template/editor/utils'
import type { ElementItem } from '@/types/management'

defineOptions({ name: 'TemplateManagement' })

const router = useRouter()
const collaborationUserStore = useCollaborationUserStore()

const loading = ref(false)
const submitLoading = ref(false)
const auditLoading = ref(false)

const list = ref<TemplateApi.TemplateVO[]>([])
const total = ref(0)

const tableRef = ref()
const selectedIds = ref<(string | undefined)[]>([])
const selectedRows = ref<TemplateApi.TemplateVO[]>([])

// 计算属性：判断是否可以批量删除（只有选中的数据都是"编辑中"(1)或"驳回"(5)状态才能删除）
const canBatchDelete = computed(() => {
  if (isEmpty(selectedRows.value)) return false
  // 如果数据没有 applyNode 字段，则允许删除（兼容旧数据）
  return every(
    selectedRows.value,
    (row) => !row.applyNode || row.applyNode === '1' || row.applyNode === '5'
  )
})

const activeTab = ref('recent')

const createTimeRange = ref<string[]>([])

const queryParams = reactive<TemplateApi.TemplatePageReqVO>({
  pageNo: 1,
  pageSize: 10,
  templateName: undefined,
  temSubclass: undefined,
  createTime: undefined,
  tabType: undefined
})

const queryFormRef = ref()

// 分类选项（模板分类本地数据）
const templateCategories = ref([{ id: 'CHWD', name: '筹划文档' }])
const categoryOptions = ref(templateCategories.value)
// 模板子类选项（从接口获取）
const subClassOptions = ref<TemplateSubclassVO[]>([])

const dialogVisible = ref(false)
const dialogTitle = ref('新建模板')
const isEditMode = ref(false) // 是否为编辑模式（编辑模式隐藏创建方式）
const formRef = ref()
const formData = reactive({
  id: undefined as number | string | undefined,
  templateName: '',
  temSubclass: '',
  description: '',
  temStatus: '',
  temCategory: '',
  creationMethod: 'new' as 'new' | 'upload',
  elements_items: [] as ElementItem[]
})

const elementsEditorVisible = ref(false)

const formRules = {
  templateName: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  temCategory: [{ required: true, message: '请选择模板分类', trigger: 'change' }],
  temSubclass: [{ required: true, message: '请选择模板子类', trigger: 'change' }]
}

const uploadFileList = ref<any[]>([])
const uploadFile = ref<File | null>(null)

const auditDialogVisible = ref(false)
const currentAuditId = ref<number | string>(0)

// 审核流程列表数据（传递给 AuditFlowDialog 组件）
const auditFlowList = [
  {
    flowId: 'flow1',
    flowName: '模板审批流1',
    nodes: [
      { nodeId: 'node1', nodeName: '节点1', users: [] as string[] },
      { nodeId: 'node2', nodeName: '节点2', users: ['user1', 'user2'] },
      { nodeId: 'node3', nodeName: '节点3', users: ['user5'] }
    ]
  },
  {
    flowId: 'flow2',
    flowName: '模板审批流2',
    nodes: [
      { nodeId: 'node1', nodeName: '节点1', users: [] as string[] },
      { nodeId: 'node2', nodeName: '节点2', users: [] as string[] }
    ]
  }
]

const userOptions = [
  { label: 'user1', value: 'user1' },
  { label: 'user2', value: 'user2' },
  { label: 'user3', value: 'user3' },
  { label: 'user4', value: 'user4' },
  { label: 'user5', value: 'user5' }
]

// 状态显示处理（兼容 "0"/"1" 和 "启用"/"禁用" 两种格式）
const getStatusText = (status: string) => {
  if (status === '0' || status === '启用') return '启用'
  if (status === '1' || status === '禁用') return '禁用'
  return status
}

const getStatusType = (status: string) => {
  if (status === '0' || status === '启用') return 'success'
  return 'info'
}

// 审核状态文本映射（编辑中:1、审核中:2、审核通过:3、发布:4、驳回:5）
const applyNodeTextMap: Record<string, string> = {
  '1': '编辑中',
  '2': '审核中',
  '3': '审核通过',
  '4': '发布',
  '5': '驳回'
}

const getApplyNodeText = (status?: string) => {
  if (!status) return '编辑中'
  return applyNodeTextMap[status] || status
}

const getApplyNodeClass = (status?: string) => {
  switch (status) {
    case '1': // 编辑中
      return 'bg-red-500'
    case '2': // 审核中
      return 'bg-orange-500'
    case '3': // 审核通过
      return 'bg-green-500'
    case '4': // 发布
      return 'bg-blue-500'
    case '5': // 驳回
      return 'bg-gray-400'
    default:
      return 'bg-gray-500'
  }
}

const getList = async () => {
  loading.value = true
  try {
    // 复制查询参数
    const params = {
      ...queryParams,
      tabType: activeTab.value
    } as Record<string, any>

    // 将 createTimeRange 数组转换为字符串格式 '2025-10-10,2025-12-12'
    if (Array.isArray(createTimeRange.value) && createTimeRange.value.length === 2) {
      params.createTime = createTimeRange.value.join(',')
    }

    // 使用 lodash pickBy 移除空值
    const cleanParams = pickBy(params, (value) => {
      if (Array.isArray(value)) return !isEmpty(value)
      return !isNil(value) && value !== ''
    })

    const data = await TemplateApi.getPageList(cleanParams as TemplateApi.TemplatePageReqVO)
    list.value = data.records || []
    total.value = data.total || 0
  } catch (error) {
    console.error('获取数据失败:', error)
    ElMessage.error('获取数据失败')
  } finally {
    loading.value = false
  }
}

// 初始化分类数据（从接口获取模板子类）
const initCategories = async () => {
  categoryOptions.value = templateCategories.value
  try {
    const res = await TemplateApi.getTemplateSubclass()
    subClassOptions.value = res.data || []
  } catch (error) {
    console.error('获取模板子类失败:', error)
    subClassOptions.value = []
  }
}

// 根据子类 ID 获取子类名称
const getSubCategoryNameById = (id: string): string => {
  // const subClass = subClassOptions.value.find((c) => c.template_id === id)
  // return subClass?.template_name || ''
  const subClass = subClassOptions.value.find((c) => c.category_id === id)
  return subClass?.category_name || ''
}

// 获取当前选中的模板子类名称（用于保存时传递 temSubName）
const getSelectedSubClassName = (): string => {
  if (!formData.temSubclass) return ''
  return getSubCategoryNameById(formData.temSubclass)
}

const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}

const resetQuery = () => {
  queryFormRef.value?.resetFields()
  queryParams.templateName = undefined
  queryParams.temSubclass = undefined
  queryParams.createTime = undefined
  createTimeRange.value = []
  activeTab.value = 'recent'
  handleQuery()
}

// 标签页切换（使用 tab-change 事件，在值更新后触发）
const handleTabChange = () => {
  queryParams.pageNo = 1
  // 清空选中状态
  selectedIds.value = []
  selectedRows.value = []
  tableRef.value?.clearSelection()
  getList()
}

// 表格选择变更
const handleSelectionChange = (rows: TemplateApi.TemplateVO[]) => {
  selectedRows.value = rows
  selectedIds.value = filter(
    map(rows, (row) => row.id),
    (id): id is string => !isNil(id) && !isEmpty(id)
  ) as (string | undefined)[]
}

const getBase64BodyLength = (dataUrl: string) => {
  const index = dataUrl.indexOf(',')
  return index === -1 ? dataUrl.length : dataUrl.length - index - 1
}

const handleAdd = () => {
  dialogTitle.value = '新建模板'
  isEditMode.value = false // 新建模式
  Object.assign(formData, {
    id: undefined,
    templateName: '',
    temCategory: '',
    temSubclass: '',
    description: '',
    temStatus: '',
    creationMethod: 'new',
    elements_items: []
  })
  uploadFileList.value = []
  uploadFile.value = null
  dialogVisible.value = true
}

// 编辑/写作 - 跳转到 Markdown 协同编辑器
const handleEdit = async (row: TemplateApi.TemplateVO) => {
  // 创建 loading 实例
  const loadingInstance = ElLoading.service({
    lock: true,
    text: '正在校验权限...',
    background: 'rgba(0, 0, 0, 0.7)'
  })

  try {
    // 1. 获取或创建协作用户
    const collaborationUser = collaborationUserStore.getOrCreateUser()
    const userId = collaborationUser.id

    // 2. 调用权限校验接口
    const checkData = { id: String(row.id), userId: userId as string }
    const permResult = await TemplateApi.checkWritePermission(checkData)

    // 3. 检查权限 - status=500 或 data=false 表示无权限
    if (permResult.status === 500 || permResult.data === false) {
      ElMessage.error('您没有该模板的写作权限')
      if (permResult.msg) {
        ElMessage.error(permResult.msg)
      }
      return
    }

    // 4. 权限通过，获取文件流
    loadingInstance.setText('正在加载文档内容...')
    const streamResult = await TemplateApi.getFileStream(String(row.id))

    // 5. 处理文件流数据
    let hasContent = false
    if (streamResult && streamResult.size > 0) {
      logDocStreamDebug('template blob received', {
        id: row.id,
        size: streamResult.size,
        type: streamResult.type
      })
      addDocStreamSnapshot(
        'template_blob_received',
        { size: streamResult.size, type: streamResult.type },
        row.id
      )
      const blobSha256 = await computeSha256HexFromBlob(streamResult)
      logDocStreamDebug('template blob sha256', {
        id: row.id,
        sha256: blobSha256 || 'unavailable'
      })
      addDocStreamSnapshot('template_blob_sha256', { sha256: blobSha256 || 'unavailable' }, row.id)
      // 将 blob 转为 base64 存储到 sessionStorage
      const base64Content = await blobToBase64(streamResult)
      logDocStreamDebug('template base64 converted', {
        id: row.id,
        dataUrlLength: base64Content.length,
        base64BodyLength: getBase64BodyLength(base64Content)
      })
      addDocStreamSnapshot(
        'template_base64_converted',
        {
          dataUrlLength: base64Content.length,
          base64BodyLength: getBase64BodyLength(base64Content)
        },
        row.id
      )
      sessionStorage.setItem(`markdown_content_${row.id}`, base64Content)
      logDocStreamDebug('template base64 stored', {
        id: row.id,
        key: `markdown_content_${row.id}`
      })
      addDocStreamSnapshot('template_base64_stored', { key: `markdown_content_${row.id}` }, row.id)
      hasContent = true
    } else {
      logDocStreamDebug('template blob empty', { id: row.id })
    }

    // 6. 准备文档信息并存储到 sessionStorage
    const docInfo = {
      id: String(row.id),
      title: row.templateName,
      content: '',
      createTime: row.createTime || new Date().toISOString(),
      updateTime: row.createTime || new Date().toISOString(),
      version: 'V1.0',
      tags: [],
      creatorId: 0,
      creatorName: row.createBy || '未知'
    }
    sessionStorage.setItem(`markdown_info_${row.id}`, JSON.stringify(docInfo))

    // 7. 跳转到模板编辑器页面
    router.push({
      path: `/template/editor/${row.id}`,
      query: {
        title: row.templateName,
        hasContent: hasContent ? 'true' : 'false'
      }
    })
  } catch (error) {
    console.error('写作权限校验失败:', error)
    ElMessage.error('操作失败，请稍后重试')
  } finally {
    loadingInstance.close()
  }
}

const handleSave = async () => {
  try {
    await formRef.value?.validate()

    // 如果是上传文档方式，检查是否选择了文件
    if (formData.creationMethod === 'upload' && isNil(uploadFile.value)) {
      ElMessage.warning('请选择要上传的文件')
      return
    }

    submitLoading.value = true

    if (formData.id) {
      // 编辑模式
      const updateData: TemplateApi.TemplateVO = {
        id: formData.id,
        templateName: formData.templateName,
        temCategory: formData.temCategory,
        temSubclass: formData.temSubclass,
        temSubName: getSelectedSubClassName(),
        temStatus: formData.temStatus,
        description: formData.description,
        elements_items: formData.elements_items
      } as TemplateApi.TemplateVO
      await TemplateApi.updateTemplate(updateData)
      ElMessage.success('更新成功')
    } else {
      // 新建模式
      // 构建保存数据
      const saveData: TemplateApi.TemplateVO = {
        templateName: formData.templateName,
        temCategory: formData.temCategory,
        temSubclass: formData.temSubclass,
        temSubName: getSelectedSubClassName(),
        description: formData.description,
        temStatus: formData.temStatus,
        elements_items: formData.elements_items
      } as TemplateApi.TemplateVO

      // 判断创建方式
      if (formData.creationMethod === 'upload') {
        // 上传文档模式
        // 先上传文档文件
        const uploadResult = await TemplateApi.saveDocument({
          file: uploadFile.value!
        })

        // 处理上传结果 - 兼容两种响应格式
        let fileId: string | null = null

        if (isString(uploadResult)) {
          // axios 封装解包后直接返回了 data 值
          fileId = uploadResult
        } else if (isObject(uploadResult)) {
          // 完整响应对象
          const result = uploadResult as { code?: number; data?: string; msg?: string }
          if (result.code === 200 || result.code === 0) {
            fileId = result.data || null
          } else {
            ElMessage.error(result.msg || '上传文档失败')
            return
          }
        }

        if (isEmpty(fileId)) {
          ElMessage.error('上传文档失败：未获取到文件ID')
          return
        }

        // 将上传返回的 fileId 传递给 savaTemplate
        saveData.fileId = fileId as string
        // 创建模板记录
        await TemplateApi.savaTemplate(saveData)
        ElMessage.success('创建成功')
      } else {
        // 新建文档模式
        await TemplateApi.savaTemplate(saveData)
        ElMessage.success('创建成功')
      }
    }

    dialogVisible.value = false
    getList()
  } catch (error: any) {
    if (error !== false) {
      console.error('保存失败:', error)
      ElMessage.error(error.message || '保存失败')
    }
  } finally {
    submitLoading.value = false
  }
}

const handleDelete = async (row: TemplateApi.TemplateVO) => {
  try {
    await ElMessageBox.confirm('确认要删除该模板吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await TemplateApi.deleteTemplate(row.id!)
    ElMessage.success('删除成功')
    getList()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const handleBatchDelete = async () => {
  if (isEmpty(selectedIds.value)) {
    ElMessage.warning('请先选择要删除的模板')
    return
  }

  // 检查是否所有选中的数据都是"编辑中"(1)或"驳回"(5)状态
  const notDeletableRows = filter(
    selectedRows.value,
    (row) => row.applyNode && row.applyNode !== '1' && row.applyNode !== '5'
  )
  if (!isEmpty(notDeletableRows)) {
    ElMessage.warning('只能删除"编辑中"或"驳回"状态的模板，请重新选择')
    return
  }

  try {
    await ElMessageBox.confirm(`确认要删除选中的 ${selectedIds.value.length} 个模板吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await TemplateApi.batchDeleteTemplate(selectedIds.value as string[])
    ElMessage.success(`成功删除 ${selectedIds.value.length} 个模板`)

    // 清空选中状态
    selectedIds.value = []
    selectedRows.value = []
    tableRef.value?.clearSelection()

    // 刷新列表
    getList()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error)
      ElMessage.error(error.message || '批量删除失败')
    }
  }
}

const handleEditData = (row: TemplateApi.TemplateVO) => {
  dialogTitle.value = '编辑模板'
  isEditMode.value = true // 编辑模式（隐藏创建方式）
  Object.assign(formData, {
    id: row.id,
    templateName: row.templateName,
    temCategory: row.temCategory,
    temSubclass: row.temSubclass,
    temSubName: row.temSubName,
    description: row.description || '',
    temStatus: row.temStatus || '0',
    elements_items: row.elements_items || []
    // 编辑模式不设置 creationMethod
  })
  uploadFileList.value = []
  uploadFile.value = null
  dialogVisible.value = true
}

const handleFileChange = (file: any) => {
  uploadFile.value = file.raw
}

const handleFileRemove = () => {
  uploadFile.value = null
}

const handleElementsConfirm = (elements: ElementItem[]) => {
  formData.elements_items = elements
}

const handleSubmitAudit = (row: TemplateApi.TemplateVO) => {
  currentAuditId.value = row.id || 0
  auditDialogVisible.value = true
}

const handleAuditSubmit = async (submitData: {
  id: string
  flowId: string
  auditors: Record<string, string[]>
  comment: string
}) => {
  auditLoading.value = true
  try {
    const result = await TemplateApi.submitAudit(submitData)

    // 处理响应 - 兼容两种格式
    if (isObject(result) && !isNil(result)) {
      const res = result as { code?: number; msg?: string }
      if (res.code === 200 || res.code === 0) {
        ElMessage.success(res.msg || '提交审核成功')
        auditDialogVisible.value = false
        getList()
      } else {
        ElMessage.error(res.msg || '提交审核失败')
      }
    } else {
      // 直接成功
      ElMessage.success('提交审核成功')
      auditDialogVisible.value = false
      getList()
    }
  } catch (error: any) {
    console.error('提交审核失败:', error)
    ElMessage.error(error.message || '提交审核失败')
  } finally {
    auditLoading.value = false
  }
}

const rejectDialogVisible = ref(false)
const rejectLoading = ref(false)
const rejectReason = ref('')
const currentRejectRow = ref<TemplateApi.TemplateVO>()

// 提交驳回 - POST /examRecord/examTem
const handleRejectSubmit = async () => {
  if (isEmpty(rejectReason.value.trim())) {
    ElMessage.warning('请输入驳回原因')
    return
  }

  if (isNil(currentRejectRow.value?.id)) return

  rejectLoading.value = true
  try {
    // 获取当前用户ID
    const collaborationUser = collaborationUserStore.getOrCreateUser()
    const userId = collaborationUser.id || 'admin'

    await TemplateApi.examApply({
      applyId: currentRejectRow.value?.id || '',
      examResult: '2', // 驳回
      examOpinion: rejectReason.value,
      examUserId: userId
    })
    ElMessage.success('驳回成功')
    rejectDialogVisible.value = false
    getList()
  } catch (error) {
    console.error('驳回失败:', error)
    ElMessage.error('驳回失败')
  } finally {
    rejectLoading.value = false
  }
}

const previewDialogVisible = ref(false)
const previewContent = ref('')
const previewTitle = ref('')

const handlePreview = async (row: TemplateApi.TemplateVO) => {
  if (!row.id) {
    ElMessage.warning('文档ID不存在')
    return
  }

  const loadingInstance = ElLoading.service({
    text: '加载文档中...',
    background: 'rgba(255, 255, 255, 0.7)'
  })

  try {
    const blob = await TemplateApi.getFileStream(String(row.id))
    if (!blob) {
      ElMessage.warning('文档内容为空')
      return
    }

    // 使用 blobToText 读取内容（防止中文乱码）
    const text = await blobToText(blob)

    // 使用自定义 markdownToHtml 转换器解析（支持红头文件、AI模块等自定义语法）
    const htmlContent = markdownToHtml(text)
    previewContent.value = htmlContent
    previewTitle.value = row.templateName || '文档预览'
    previewDialogVisible.value = true
  } catch (error) {
    console.error('预览失败:', error)
    ElMessage.error('预览失败，请稍后重试')
  } finally {
    loadingInstance.close()
  }
}

const handleExport = async (row: TemplateApi.TemplateVO) => {
  if (!row.id) {
    ElMessage.warning('文档ID不存在')
    return
  }

  const loadingInstance = ElLoading.service({
    text: '导出文档中...',
    background: 'rgba(255, 255, 255, 0.7)'
  })

  try {
    const blob = await TemplateApi.getFileStream(String(row.id))
    if (!blob) {
      ElMessage.warning('文档内容为空')
      return
    }

    // 使用 blobToText 读取内容（防止中文乱码）
    const text = await blobToText(blob)

    // 添加 UTF-8 BOM 头，确保在 Windows 记事本等编辑器中正确显示中文
    const BOM = '\uFEFF'
    const exportBlob = new Blob([BOM + text], { type: 'text/markdown;charset=utf-8' })

    // 创建下载链接
    const url = window.URL.createObjectURL(exportBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${row.templateName || '文档'}.md`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败，请稍后重试')
  } finally {
    loadingInstance.close()
  }
}

const examRecordDialogVisible = ref(false)
const examRecordLoading = ref(false)
const examRecordList = ref<TemplateApi.ExamRecordVO[]>([])

const publishDialogVisible = ref(false)
const publishLoading = ref(false)
const currentPublishRow = ref<TemplateApi.TemplateVO>()
const publishFormData = reactive({
  visibleScope: [] as string[]
})

const openPublishDialog = (row: TemplateApi.TemplateVO) => {
  currentPublishRow.value = row
  publishDialogVisible.value = true
  publishFormData.visibleScope = ['user1', 'user2', 'user3'] // 默认回显
}

const handlePublishSubmit = async () => {
  if (isNil(currentPublishRow.value?.id)) return
  publishLoading.value = true
  try {
    const result = await TemplateApi.publishDocument({
      id: currentPublishRow.value?.id || '',
      visibleScope: publishFormData.visibleScope
    })

    // 处理响应 - 兼容两种格式
    if (isObject(result) && !isNil(result)) {
      const res = result as { code?: number; msg?: string }
      if (res.code === 200 || res.code === 0) {
        ElMessage.success(res.msg || '发布成功')
        publishDialogVisible.value = false
        getList()
      } else {
        ElMessage.error(res.msg || '发布失败')
      }
    } else {
      // 直接成功
      ElMessage.success('发布成功')
      publishDialogVisible.value = false
      getList()
    }
  } catch (error: any) {
    console.error('发布失败:', error)
    ElMessage.error(error.message || '发布失败')
  } finally {
    publishLoading.value = false
  }
}

const handleReviewExecute = async (row: TemplateApi.TemplateVO) => {
  // 创建 loading 实例
  const loadingInstance = ElLoading.service({
    lock: true,
    text: '正在加载文档...',
    background: 'rgba(0, 0, 0, 0.7)'
  })

  try {
    // 获取文件流
    loadingInstance.setText('正在加载文档内容...')
    const streamResult = await TemplateApi.getFileStream(String(row.id))

    // 处理文件流数据
    let hasContent = false
    if (streamResult && streamResult.size > 0) {
      const base64Content = await blobToBase64(streamResult)
      sessionStorage.setItem(`markdown_content_${row.id}`, base64Content)
      hasContent = true
    }

    // 准备文档信息
    const docInfo = {
      id: String(row.id),
      title: row.templateName,
      content: '',
      createTime: row.createTime || new Date().toISOString(),
      updateTime: row.createTime || new Date().toISOString(),
      version: 'V1.0',
      tags: [],
      creatorId: 0,
      creatorName: row.createBy || '未知'
    }
    sessionStorage.setItem(`markdown_info_${row.id}`, JSON.stringify(docInfo))

    // 跳转到模板编辑器页面（只读审核模式）
    router.push({
      path: `/template/editor/${row.id}`,
      query: {
        title: row.templateName,
        hasContent: hasContent ? 'true' : 'false',
        readonly: 'true', // 只读模式
        reviewMode: 'true' // 审核模式
      }
    })
  } catch (error) {
    console.error('加载文档失败:', error)
    ElMessage.error('加载失败，请稍后重试')
  } finally {
    loadingInstance.close()
  }
}

// 打开审核记录弹窗
const openExamRecordDialog = async (row: TemplateApi.TemplateVO) => {
  if (!row.id) return
  examRecordDialogVisible.value = true
  examRecordLoading.value = true
  examRecordList.value = []

  try {
    const res = await TemplateApi.getExamRecordList(row.id)
    // 兼容两种返回格式：数组或 { data: [...] }
    examRecordList.value = Array.isArray(res) ? res : res.data || []
  } catch (error) {
    console.error('获取审核记录失败:', error)
    ElMessage.error('获取审核记录失败')
  } finally {
    examRecordLoading.value = false
  }
}

// 页面初始化
onMounted(async () => {
  await initCategories()
  getList()
})

// 页面重新激活时刷新数据（从编辑器返回时触发）
onActivated(() => {
  getList()
})

// 页面销毁时清理
onUnmounted(() => {
  // 清理选中状态和列表数据，避免内存泄漏
  selectedRows.value = []
  selectedIds.value = []
  list.value = []
})
</script>

<style scoped lang="scss">
@use '@/lmStyles/dialog.scss';
@use '@/lmStyles/table.scss';
.template-management {
  padding: 0;
  height: calc(100vh - 90px); // 减去头部和标签栏高度
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.table-container-wrap {
  :deep(.el-card__body) {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 0;
  }
}
</style>
