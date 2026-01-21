<template>
  <div class="my-login-container">
    <div class="login-content">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-wrapper">
        <el-icon class="loading-icon" :size="48">
          <Loading />
        </el-icon>
        <p class="loading-text">正在验证登录信息...</p>
      </div>

      <!-- 错误状态（缺少token时显示） -->
      <div v-else class="error-wrapper">
        <el-icon class="error-icon" :size="48">
          <CircleCloseFilled />
        </el-icon>
        <p class="error-title">访问受限</p>
        <p class="error-text">缺少登录凭证，请从外部系统重新进入</p>
        <p class="error-hint">请联系管理员获取正确的访问链接</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Loading, CircleCloseFilled } from '@element-plus/icons-vue'
import { getAccessToken } from '@/utils/auth'

defineOptions({ name: 'MyLogin' })

const route = useRoute()
const router = useRouter()

const loading = ref(true)

// 检查是否已有token，如果有则直接跳转
onMounted(async () => {
  // 如果URL中有token参数，路由守卫会处理存储和重定向
  // 这里只处理没有token的情况
  const urlToken = route.query.token as string
  
  if (urlToken) {
    // 有token参数，等待路由守卫处理
    return
  }

  // 检查是否已经存储了token
  if (getAccessToken()) {
    // 已有token，跳转到首页
    router.replace('/training/performance')
    return
  }

  // 没有token，显示错误提示
  loading.value = false
})
</script>

<style lang="scss" scoped>
.my-login-container {
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-content {
  background: #fff;
  border-radius: 12px;
  padding: 48px 64px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  text-align: center;
  min-width: 320px;
}

.loading-wrapper,
.error-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.loading-icon {
  color: #409eff;
  animation: rotate 1.5s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.error-icon {
  color: #f56c6c;
}

.loading-text {
  color: #606266;
  font-size: 16px;
  margin: 0;
}

.error-title {
  color: #303133;
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.error-text {
  color: #606266;
  font-size: 16px;
  margin: 0;
}

.error-hint {
  color: #909399;
  font-size: 14px;
  margin: 0;
}
</style>
