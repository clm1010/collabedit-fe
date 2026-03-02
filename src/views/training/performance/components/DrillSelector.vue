<template>
  <el-dialog
    v-model="dialogVisible"
    title="请选择"
    width="1200px"
    append-to-body
    class="custom-dialog-header"
    :close-on-click-modal="false"
  >
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
              <el-option
                v-for="item in levelOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
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
                v-for="item in academyOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="演训城市" prop="city">
            <el-select v-model="filterParams.city" clearable placeholder="请选择" class="!w-240px">
              <el-option
                v-for="item in cityOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
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
      <el-table-column label="演训类型" prop="exerciseType" width="120" align="center">
        <template #default="scope">
          {{
            exerciseTypeOptions.find((o) => o.value === scope.row.exerciseType)?.label ||
            scope.row.exerciseType ||
            ''
          }}
        </template>
      </el-table-column>
      <el-table-column label="演训等级" prop="level" width="100" align="center">
        <template #default="scope">
          {{
            props.levelOptions.find((o) => o.value === scope.row.level)?.label || scope.row.level || ''
          }}
        </template>
      </el-table-column>
      <el-table-column label="演训参演单位" prop="participatingUnits" width="160" align="center" />
      <el-table-column label="演训城市" prop="city" width="100" align="center">
        <template #default="scope">
          {{ cityOptions.find((o) => o.value === scope.row.city)?.label || scope.row.city || '' }}
        </template>
      </el-table-column>
      <el-table-column label="演训学院" prop="academy" width="100" align="center">
        <template #default="scope">
          {{
            props.academyOptions.find((o) => o.value === scope.row.academy)?.label ||
            scope.row.academy ||
            ''
          }}
        </template>
      </el-table-column>
      <el-table-column label="演训科目" prop="subject" width="120" align="center" />
      <el-table-column label="演训课题" prop="course" width="120" align="center" />
      <el-table-column label="演训内容" prop="content" width="200" align="center" />
      <el-table-column label="演训相关集成系统" prop="relatedSystems" width="140" align="center" />
      <el-table-column label="实施计划" prop="implPlan" width="200" align="center" />
      <el-table-column label="编组信息" prop="groupingInfo" width="160" align="center" />
      <el-table-column label="重点班次" prop="keyClasses" width="100" align="center" />
      <el-table-column label="参与人数" prop="participantCount" width="100" align="center" />
      <el-table-column label="创建人" prop="updater" width="100" align="center" />
      <el-table-column label="开始时间" prop="startTime" width="180" align="center">
        <template #default="scope">
          {{ scope.row.startTime ? dayjs(scope.row.startTime).format('YYYY-MM-DD HH:mm:ss') : '' }}
        </template>
      </el-table-column>
      <el-table-column label="结束时间" prop="endTime" width="180" align="center">
        <template #default="scope">
          {{ scope.row.endTime ? dayjs(scope.row.endTime).format('YYYY-MM-DD HH:mm:ss') : '' }}
        </template>
      </el-table-column>
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
import dayjs from 'dayjs'
import { Icon } from '@/components/Icon'
import * as PerformanceApi from '@/api/training'

import type { DocCategoryVO } from '@/views/training/performance/config/categories'

interface Props {
  visible: boolean
  exerciseTypeOptions?: DocCategoryVO[]
  levelOptions?: DocCategoryVO[]
  academyOptions?: DocCategoryVO[]
  cityOptions?: DocCategoryVO[]
}

const props = withDefaults(defineProps<Props>(), {
  exerciseTypeOptions: () => [],
  levelOptions: () => [],
  academyOptions: () => [],
  cityOptions: () => []
})

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'select', row: any): void
}>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const loading = ref(false)
const dataList = ref<any[]>([])
const total = ref(0)

const filterFormRef = ref()
const filterParams = reactive({
  exerciseName: '',
  exerciseType: '',
  level: '',
  academy: '',
  city: ''
})

const pageParams = reactive({
  pageNo: 1,
  pageSize: 10
})

const loadData = async () => {
  try {
    loading.value = true
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

const handleSearch = () => {
  pageParams.pageNo = 1
  loadData()
}

const handleReset = () => {
  filterFormRef.value?.resetFields()
  pageParams.pageNo = 1
  loadData()
}

const handleSelect = (row: any) => {
  if (!row) return
  emit('select', row)
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      loadData()
    }
  }
)
</script>
