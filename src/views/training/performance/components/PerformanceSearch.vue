<template>
  <ContentWrap class="flex-shrink-0">
    <el-form
      class="-mb-15px"
      :model="localParams"
      ref="queryFormRef"
      :inline="true"
      label-width="100px"
    >
      <el-row>
        <el-col :span="24">
          <el-form-item label="方案名称" prop="planName">
            <el-input
              v-model="localParams.planName"
              placeholder="请输入"
              clearable
              class="!w-260px"
            />
          </el-form-item>
          <!-- <el-form-item label="演训主题" prop="exerciseTheme">
            <el-select
              v-model="localParams.exerciseTheme"
              placeholder="请选择"
              clearable
              class="!w-200px"
            >
              <el-option
                v-for="item in exerciseThemeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item> -->

          <el-form-item label="演训等级" prop="level">
            <el-select v-model="localParams.level" placeholder="请选择" clearable class="!w-260px">
              <el-option
                v-for="item in levelOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="所属学院" prop="collegeCode">
            <el-select
              v-model="localParams.collegeCode"
              placeholder="请选择"
              clearable
              class="!w-260px"
            >
              <el-option
                v-for="item in academyOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="文档分类" prop="fileType">
            <el-select
              v-model="localParams.fileType"
              placeholder="请选择"
              clearable
              class="!w-260px"
            >
              <el-option
                v-for="item in fileTypeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.label"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="审核状态" prop="applyNode">
            <el-select
              v-model="localParams.applyNode"
              placeholder="请选择"
              clearable
              class="!w-260px"
            >
              <el-option label="编辑中" value="1" />
              <el-option label="审核中" value="2" />
              <el-option label="审核通过" value="3" />
              <el-option label="发布" value="4" />
              <el-option label="驳回" value="5" />
            </el-select>
          </el-form-item>
          <el-form-item label="上传时间" prop="createTime">
            <el-date-picker
              v-model="localParams.createTime"
              type="daterange"
              start-placeholder="请选择"
              end-placeholder="请选择"
              value-format="YYYY-MM-DD"
              class="!w-260px"
            />
          </el-form-item>
          <el-form-item label="" class="">
            <el-button type="primary" @click="handleQuery">
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
  </ContentWrap>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@/components/Icon'
import type { TrainingPerformancePageReqVO } from '@/api/training'
import type { DocCategoryVO } from '@/api/training'

const fileTypeOptions = computed(() => {
  return props.categories.filter((item) => item.value !== '0')
})

interface Props {
  modelValue: TrainingPerformancePageReqVO
  categories?: DocCategoryVO[]
  levelOptions?: DocCategoryVO[]
  academyOptions?: DocCategoryVO[]
}

const props = withDefaults(defineProps<Props>(), {
  categories: () => [],
  levelOptions: () => [],
  academyOptions: () => []
})

// Emits
const emit = defineEmits<{
  (e: 'update:modelValue', value: TrainingPerformancePageReqVO): void
  (e: 'search'): void
  (e: 'reset'): void
}>()

// 使用计算属性创建本地可修改的引用，修改时通过 emit 通知父组件
const localParams = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 查询
const handleQuery = () => {
  emit('search')
}

// 重置
const handleReset = () => {
  // 单独更新每个属性，确保响应式
  localParams.value.planName = undefined
  localParams.value.exerciseTheme = undefined
  localParams.value.level = undefined
  localParams.value.collegeCode = undefined
  localParams.value.applyNode = undefined
  localParams.value.createTime = undefined
  localParams.value.fileType = undefined // 重置文档分类
  emit('reset')
}

// 暴露方法给父组件
defineExpose({
  resetFields: () => {
    localParams.value.planName = undefined
    localParams.value.exerciseTheme = undefined
    localParams.value.level = undefined
    localParams.value.collegeCode = undefined
    localParams.value.applyNode = undefined
    localParams.value.createTime = undefined
    localParams.value.fileType = undefined // 重置文档分类
  }
})
</script>
