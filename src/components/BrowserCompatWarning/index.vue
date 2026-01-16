<template>
  <el-dialog
    v-model="dialogVisible"
    title="浏览器兼容性提示"
    width="480px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="allowClose"
    class="browser-compat-dialog"
  >
    <div class="compat-content">
      <!-- 警告图标 -->
      <div class="warning-icon">
        <el-icon :size="48" color="#E6A23C">
          <Warning />
        </el-icon>
      </div>

      <!-- 主要提示信息 -->
      <div class="main-message">
        <p v-if="!supportResult?.supported" class="error-text">
          {{ supportResult?.reason }}
        </p>
        <p v-else-if="isLowVersion" class="warning-text">
          您的浏览器版本较低，可能影响协同编辑体验
        </p>
      </div>

      <!-- 浏览器信息 -->
      <div class="browser-info">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="当前浏览器">
            {{ browserDisplayName }}
          </el-descriptions-item>
          <el-descriptions-item v-if="supportResult?.browser.isChromium" label="内核版本">
            Chromium {{ supportResult?.browser.chromiumVersion }}
          </el-descriptions-item>
          <el-descriptions-item label="最低要求">
            Chromium {{ MIN_CHROMIUM_VERSION }}+
          </el-descriptions-item>
          <el-descriptions-item label="推荐版本">
            Chromium {{ RECOMMENDED_CHROMIUM_VERSION }}+
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 功能支持检测详情 -->
      <el-collapse v-if="showDetails" class="support-details">
        <el-collapse-item title="功能支持详情" name="details">
          <div class="detail-list">
            <div v-for="(supported, feature) in featureSupport" :key="feature" class="detail-item">
              <el-icon :color="supported ? '#67C23A' : '#F56C6C'">
                <CircleCheck v-if="supported" />
                <CircleClose v-else />
              </el-icon>
              <span>{{ featureNames[feature] }}</span>
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>

      <!-- 升级建议 -->
      <div class="upgrade-suggestion">
        <el-alert :title="upgradeSuggestion" type="info" :closable="false" show-icon />
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button v-if="allowClose" @click="handleClose"> 我知道了 </el-button>
        <el-button v-if="!supportResult?.supported" type="primary" @click="handleRefresh">
          刷新页面
        </el-button>
        <el-button
          v-if="supportResult?.supported && allowContinue"
          type="primary"
          @click="handleContinue"
        >
          继续使用
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Warning, CircleCheck, CircleClose } from '@element-plus/icons-vue'
import {
  checkCollaborationSupport,
  formatBrowserInfo,
  getBrowserUpgradeSuggestion,
  MIN_CHROMIUM_VERSION,
  RECOMMENDED_CHROMIUM_VERSION,
  type CollaborationSupportResult
} from '@/utils/browserCompat'

defineOptions({ name: 'BrowserCompatWarning' })

const props = withDefaults(
  defineProps<{
    /** 是否自动检测并显示 */
    autoCheck?: boolean
    /** 是否允许关闭 */
    allowClose?: boolean
    /** 是否允许继续（即使版本较低） */
    allowContinue?: boolean
    /** 是否显示详细检测结果 */
    showDetails?: boolean
  }>(),
  {
    autoCheck: true,
    allowClose: true,
    allowContinue: true,
    showDetails: true
  }
)

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'continue'): void
  (e: 'check-complete', result: CollaborationSupportResult): void
}>()

const dialogVisible = ref(false)
const supportResult = ref<CollaborationSupportResult | null>(null)

/** 功能名称映射 */
const featureNames: Record<string, string> = {
  webSocket: 'WebSocket 通信',
  broadcastChannel: 'BroadcastChannel API',
  indexedDB: 'IndexedDB 存储',
  mutationObserver: 'MutationObserver',
  esModules: 'ES Modules',
  versionOk: '浏览器版本'
}

/** 功能支持状态 */
const featureSupport = computed(() => {
  if (!supportResult.value) return {}
  return supportResult.value.details
})

/** 浏览器显示名称 */
const browserDisplayName = computed(() => {
  if (!supportResult.value) return ''
  return formatBrowserInfo(supportResult.value.browser)
})

/** 是否是低版本（但仍可用） */
const isLowVersion = computed(() => {
  if (!supportResult.value) return false
  const { browser } = supportResult.value
  return (
    browser.isChromium &&
    browser.chromiumVersion >= MIN_CHROMIUM_VERSION &&
    browser.chromiumVersion < RECOMMENDED_CHROMIUM_VERSION
  )
})

/** 升级建议 */
const upgradeSuggestion = computed(() => {
  if (!supportResult.value) return ''
  return getBrowserUpgradeSuggestion(supportResult.value.browser)
})

/**
 * 执行浏览器兼容性检测
 */
const checkBrowser = (): CollaborationSupportResult => {
  const result = checkCollaborationSupport()
  supportResult.value = result
  emit('check-complete', result)
  return result
}

/**
 * 显示对话框
 */
const show = () => {
  dialogVisible.value = true
}

/**
 * 隐藏对话框
 */
const hide = () => {
  dialogVisible.value = false
}

/**
 * 处理关闭
 */
const handleClose = () => {
  hide()
  emit('close')
}

/**
 * 处理继续
 */
const handleContinue = () => {
  hide()
  emit('continue')
}

/**
 * 处理刷新
 */
const handleRefresh = () => {
  window.location.reload()
}

// 自动检测
onMounted(() => {
  if (props.autoCheck) {
    const result = checkBrowser()
    // 如果不支持或版本过低，自动显示提示
    if (!result.supported || isLowVersion.value) {
      show()
    }
  }
})

// 暴露方法
defineExpose({
  checkBrowser,
  show,
  hide,
  supportResult
})
</script>

<style lang="scss" scoped>
.browser-compat-dialog {
  :deep(.el-dialog__body) {
    padding: 16px 24px;
  }
}

.compat-content {
  .warning-icon {
    text-align: center;
    margin-bottom: 16px;
  }

  .main-message {
    text-align: center;
    margin-bottom: 16px;

    .error-text {
      color: #f56c6c;
      font-size: 15px;
      font-weight: 500;
      margin: 0;
    }

    .warning-text {
      color: #e6a23c;
      font-size: 15px;
      font-weight: 500;
      margin: 0;
    }
  }

  .browser-info {
    margin-bottom: 16px;
  }

  .support-details {
    margin-bottom: 16px;

    .detail-list {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
    }
  }

  .upgrade-suggestion {
    margin-top: 8px;
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
