<template>
  <el-dialog
    v-model="dialogVisible"
    title="请选择"
    width="1200px"
    append-to-body
    class="custom-dialog-header"
    :close-on-click-modal="false"
  >
    <!-- 筛选栏 -->
    <el-form ref="filterFormRef" :model="filterParams" :inline="true" class="mb-4">
      <el-row :gutter="24" justify="center">
        <el-col :span="8">
          <el-form-item label="演训名称" prop="exerciseName">
            <el-input
              v-model="filterParams.exerciseName"
              clearable
              placeholder="请输入演训名称"
              class="!w-240px"
            />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="演训类型" prop="exerciseType">
            <el-select
              v-model="filterParams.exerciseType"
              clearable
              placeholder="请选择"
              class="!w-240px"
            >
              <el-option
                v-for="item in exerciseTypeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="演训等级" prop="level">
            <el-select v-model="filterParams.level" clearable placeholder="请选择" class="!w-240px">
              <el-option label="战略级" value="ZLJ" />
              <el-option label="战役级" value="ZYJ" />
              <el-option label="战术级" value="ZSJ" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="演训学院" prop="academy">
            <el-select
              v-model="filterParams.academy"
              clearable
              placeholder="请选择"
              class="!w-240px"
            >
              <el-option
                v-for="item in collegeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="演训城市" prop="city">
            <el-input v-model="filterParams.city" clearable placeholder="请输入" class="!w-240px" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="" class="">
            <el-button type="primary" @click="handleSearch">
              <Icon icon="ep:search" class="mr-1" />
              查询
            </el-button>
            <el-button @click="handleReset">
              <Icon icon="ep:refresh" class="mr-1" />
              重置
            </el-button>
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <!-- 列表 -->
    <el-table
      v-loading="loading"
      :data="dataList"
      border
      stripe
      highlight-current-row
      @current-change="handleSelect"
      class="w-full"
      height="400px"
    >
      <el-table-column label="序号" type="index" width="60" align="center" />
      <el-table-column label="演训名称" prop="exerciseName" min-width="160" align="center" />
      <el-table-column label="演训支持单位" prop="supportUnit" width="160" align="center" />
      <el-table-column label="演训组织单位" prop="organizer" width="140" align="center" />
      <el-table-column label="演训类型" prop="exerciseType" width="120" align="center" />
      <el-table-column label="演训等级" prop="level" width="100" align="center" />
      <el-table-column label="演训参演单位" prop="participatingUnits" width="160" align="center" />
      <el-table-column label="演训城市" prop="city" width="100" align="center" />
      <el-table-column label="演训学院" prop="academy" width="100" align="center" />
      <el-table-column label="演训科目" prop="subject" width="120" align="center" />
      <el-table-column label="演训课题" prop="course" width="120" align="center" />
      <el-table-column label="演训内容" prop="content" width="200" align="center" />
      <el-table-column label="演训相关集成系统" prop="relatedSystems" width="140" align="center" />
      <el-table-column label="实施计划" prop="implPlan" width="200" align="center" />
      <el-table-column label="编组信息" prop="groupingInfo" width="160" align="center" />
      <el-table-column label="重点班次" prop="keyClasses" width="100" align="center" />
      <el-table-column label="参与人数" prop="participantCount" width="100" align="center" />
      <el-table-column label="创建人" prop="updater" width="100" align="center" />
      <el-table-column label="开始时间" prop="startTime" width="120" align="center" />
      <el-table-column label="结束时间" prop="endTime" width="120" align="center" />
    </el-table>

    <div class="mt-4 flex justify-end">
      <Pagination
        v-model:page="pageParams.pageNo"
        v-model:limit="pageParams.pageSize"
        :total="total"
        :page-sizes="[5, 10, 20, 30, 50, 100]"
        @pagination="loadData"
      />
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { isEmpty, isNil, isArray, pickBy } from 'lodash-es'
import { Icon } from '@/components/Icon'
import * as PerformanceApi from '@/api/training'

// 演训类型选项
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

// 所属学院选项
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

// Props
interface Props {
  visible: boolean
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'select', row: any): void
}>()

// 双向绑定 visible
const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

// 状态
const loading = ref(false)
const dataList = ref<any[]>([])
const total = ref(0)

// 筛选参数
const filterFormRef = ref()
const filterParams = reactive({
  exerciseName: '',
  exerciseType: '',
  level: '',
  academy: '',
  city: ''
})

// 分页参数
const pageParams = reactive({
  pageNo: 1,
  pageSize: 10
})

// 加载数据
const loadData = async () => {
  try {
    loading.value = true
    // 使用 lodash pickBy 过滤空值
    const params = pickBy(filterParams, (value) => {
      if (isArray(value)) return !isEmpty(value)
      return !isNil(value) && value !== ''
    })
    const res = await PerformanceApi.getExerciseData({
      pageNo: pageParams.pageNo,
      pageSize: pageParams.pageSize,
      ...params
    })
    dataList.value = res.records || []
    total.value = res.total || 0
  } catch (error) {
    console.error('获取演训数据列表失败:', error)
    ElMessage.error('获取演训数据列表失败')
  } finally {
    loading.value = false
  }
}

// 查询
const handleSearch = () => {
  pageParams.pageNo = 1
  loadData()
}

// 重置
const handleReset = () => {
  filterFormRef.value?.resetFields()
  pageParams.pageNo = 1
  loadData()
}

// 选择行
const handleSelect = (row: any) => {
  if (!row) return
  emit('select', row)
}

// 监听弹窗打开
watch(
  () => props.visible,
  (val) => {
    if (val) {
      loadData()
    }
  }
)
</script>
