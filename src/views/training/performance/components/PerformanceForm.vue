<template>
  <el-dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    width="800px"
    :close-on-click-modal="false"
    class="custom-dialog-header"
  >
    <el-form ref="formRef" :model="formData" :rules="formRules" label-width="140px">
      <el-form-item label="演训数据">
        <div class="w-full flex gap-2">
          <el-input
            v-model="formData.exerciseName"
            placeholder="请选择"
            readonly
            :suffix-icon="ArrowDown"
            class="cursor-pointer flex-1"
            @click="$emit('open-drill-selector')"
          />
          <el-button v-if="formData.planId" type="danger" plain @click="handleClearExerciseData"
            >清空</el-button
          >
        </div>
      </el-form-item>

      <el-form-item label="筹划方案名称" prop="planName">
        <el-input v-model="formData.planName" placeholder="请输入" clearable />
      </el-form-item>
      <el-form-item v-show="false" label="演训类型" prop="exerciseType">
        <el-select
          v-model="formData.exerciseType"
          placeholder="请选择"
          clearable
          :disabled="isExerciseFieldDisabled"
          class="w-full"
        >
          <el-option
            v-for="item in exerciseTypeOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item v-show="false" label="演训等级" prop="level">
        <el-select
          v-model="formData.level"
          placeholder="请选择"
          clearable
          :disabled="isExerciseFieldDisabled"
          class="w-full"
        >
          <el-option
            v-for="item in levelOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item v-show="false" label="所属学院" prop="collegeCode">
        <el-select
          v-model="formData.collegeCode"
          placeholder="请选择"
          clearable
          :disabled="isExerciseFieldDisabled"
          class="w-full"
        >
          <el-option
            v-for="item in collegeOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="文档分类" prop="fileType">
        <el-select v-model="formData.fileType" placeholder="请选择" clearable class="w-full">
          <el-option
            v-for="item in fileTypeOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="简介">
        <el-input v-model="formData.description" type="textarea" :rows="3" placeholder="请输入" />
      </el-form-item>

      <el-form-item label="可编辑用户" prop="activeUser">
        <el-select
          v-model="formData.activeUser"
          multiple
          placeholder="请选择"
          clearable
          class="w-full"
        >
          <el-option
            v-for="item in activeUserOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item v-if="!isEditMode" label="创建方式" prop="creationMethod">
        <el-radio-group v-model="formData.creationMethod">
          <el-radio label="new">新建文档</el-radio>
          <el-radio label="upload">上传文档</el-radio>
        </el-radio-group>
      </el-form-item>

      <div v-if="!isEditMode && formData.creationMethod === 'upload'" class="pl-[120px] mt-4">
        <div class="flex items-start">
          <span class="text-red-500 mr-1">*</span>
          <el-upload
            class="upload-demo w-full"
            drag
            action="#"
            :auto-upload="false"
            :file-list="uploadFileList"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            accept=".docx"
          >
            <Icon icon="ep:upload-filled" class="el-icon--upload text-50px text-gray-400" />
            <div class="el-upload__text"> 将文件拖到此处，或 <em>点击上传</em> </div>
            <template #tip>
              <div class="el-upload__tip text-red-500"> * 支持 doc, docx 格式文件（必选） </div>
            </template>
          </el-upload>
        </div>
      </div>
    </el-form>

    <template #footer>
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" @click="handleSave" :loading="loading">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick } from 'vue'
import { ArrowDown } from '@element-plus/icons-vue'
import { isEmpty } from 'lodash-es'
import { Icon } from '@/components/Icon'

interface Props {
  visible: boolean
  isEditMode: boolean
  loading: boolean
  fileTypeOptions: { label: string; value: string }[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'save', data: FormData, uploadFile: File | null): void
  (e: 'open-drill-selector'): void
}>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const dialogTitle = computed(() => (props.isEditMode ? '编辑筹划方案' : '新建筹划方案'))

export interface FormData {
  id: string
  planId: string
  exerciseName: string
  planName: string
  exerciseTheme: string
  exerciseType: string
  level: string
  collegeCode: string
  fileType: string
  description: string
  activeUser: string[]
  creationMethod: 'new' | 'upload'
}

const formData = reactive<FormData>({
  id: '',
  planId: '',
  exerciseName: '',
  planName: '',
  exerciseTheme: '',
  exerciseType: '',
  level: '',
  collegeCode: '',
  fileType: '',
  description: '',
  activeUser: [],
  creationMethod: 'new'
})

const uploadFileList = ref<any[]>([])
const uploadFile = ref<File | null>(null)
const formRef = ref()

const formRules = {
  planName: [{ required: true, message: '请输入筹划方案名称', trigger: 'blur' }],
  fileType: [{ required: true, message: '请选择文档分类', trigger: 'change' }],
  activeUser: [{ required: true, message: '请选择可编辑用户', trigger: 'change' }],
  creationMethod: [{ required: true, message: '请选择创建方式', trigger: 'change' }]
}

const isExerciseFieldDisabled = computed(() => {
  return !isEmpty(formData.planId) && !isEmpty(formData.exerciseName)
})

const exerciseThemeOptions = [
  { label: '联合作战训练', value: 'LHZZYX' },
  { label: '作战训练', value: 'ZUOZL' },
  { label: '政治训练', value: 'ZZL' },
  { label: '经济训练', value: 'JJL' },
  { label: '认知训练', value: 'RZL' },
  { label: '文化训练', value: 'WHL' },
  { label: '后装训练', value: 'HZL' }
]

const exerciseTypeOptions = [
  { label: '大学年度演训', value: 'DXNDYX' },
  { label: '联合类', value: 'LHL' },
  { label: '作战类', value: 'ZUOZL' },
  { label: '政治类', value: 'ZZL' },
  { label: '经济类', value: 'JJL' },
  { label: '认知类', value: 'RZL' },
  { label: '文化类', value: 'WHL' },
  { label: '后装类', value: 'HZL' },
  { label: '国际防务类', value: 'GJFWL' },
  { label: '网络类', value: 'WLL' },
  { label: '电磁类', value: 'DCL' },
  { label: '太空类', value: 'TKL' }
]

const levelOptions = [
  { label: '战略级', value: 'ZLJ' },
  { label: '战役级', value: 'YXJ' },
  { label: '战术级', value: 'ZSJ' }
]

const collegeOptions = [
  { label: '国防大学', value: 'GFDX' },
  { label: '联合作战学院', value: 'LHZZXY' },
  { label: '国家安全学院', value: 'GJAQXY' },
  { label: '联合勤务学院', value: 'LHQWXY' },
  { label: '国际防务学院', value: 'GJFWXY' },
  { label: '军事管理学院', value: 'SGLXY' },
  { label: '政治学院', value: 'ZZXY' },
  { label: '军事文华学院', value: 'JSWHXY' },
  { label: '研究生院', value: 'YJSY' }
]

const activeUserOptions = [
  { label: '管理员', value: 'admin' },
  { label: '参谋人员A', value: 'staff_a' },
  { label: '参谋人员B', value: 'staff_b' }
]

const handleClearExerciseData = () => {
  formData.planId = ''
  formData.exerciseName = ''
}

const handleFileChange = (file: any) => {
  uploadFile.value = file.raw
}

const handleFileRemove = () => {
  uploadFile.value = null
}

const handleCancel = () => {
  dialogVisible.value = false
}

const handleSave = async () => {
  try {
    await formRef.value?.validate()
    emit('save', { ...formData }, uploadFile.value)
  } catch {
    // 验证失败
  }
}

const resetForm = () => {
  Object.assign(formData, {
    id: '',
    planId: '',
    exerciseName: '',
    planName: '',
    exerciseTheme: '',
    exerciseType: '',
    level: '',
    collegeCode: '',
    fileType: '',
    description: '',
    activeUser: [],
    creationMethod: 'new'
  })
  uploadFileList.value = []
  uploadFile.value = null
  nextTick(() => {
    formRef.value?.clearValidate()
  })
}

const setFormData = (data: Partial<FormData>) => {
  Object.assign(formData, data)
  uploadFileList.value = []
  uploadFile.value = null
  nextTick(() => {
    formRef.value?.clearValidate()
  })
}

const setDrillData = (drillData: any) => {
  formData.planId = drillData.id || ''
  formData.exerciseName = drillData.exerciseName || ''
  if (drillData.exerciseTheme) formData.exerciseTheme = drillData.exerciseTheme
  if (drillData.exerciseType) formData.exerciseType = drillData.exerciseType
  if (drillData.level) formData.level = drillData.level
  if (drillData.academy) formData.collegeCode = drillData.academy
  formRef.value?.validateField('planId')
}

defineExpose({
  resetForm,
  setFormData,
  setDrillData,
  formData,
  uploadFile
})
</script>
