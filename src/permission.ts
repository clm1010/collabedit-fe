import router from './router'
import type { RouteRecordRaw } from 'vue-router'
import { isRelogin } from '@/config/axios/service'
import { getAccessToken, isExternalTokenMode, setExternalToken } from '@/utils/auth'
import { useTitle } from '@/hooks/web/useTitle'
import { useNProgress } from '@/hooks/web/useNProgress'
import { usePageLoading } from '@/hooks/web/usePageLoading'
import { useDictStoreWithOut } from '@/store/modules/dict'
import { useUserStoreWithOut } from '@/store/modules/user'
import { usePermissionStoreWithOut } from '@/store/modules/permission'

const { start, done } = useNProgress()

const { loadStart, loadDone } = usePageLoading()

const parseURL = (
  url: string | null | undefined
): { basePath: string; paramsObject: { [key: string]: string } } => {
  // 如果输入为 null 或 undefined，返回空字符串和空对象
  if (url == null) {
    return { basePath: '', paramsObject: {} }
  }

  // 找到问号 (?) 的位置，它之前是基础路径，之后是查询参数
  const questionMarkIndex = url.indexOf('?')
  let basePath = url
  const paramsObject: { [key: string]: string } = {}

  // 如果找到了问号，说明有查询参数
  if (questionMarkIndex !== -1) {
    // 获取 basePath
    basePath = url.substring(0, questionMarkIndex)

    // 从 URL 中获取查询字符串部分
    const queryString = url.substring(questionMarkIndex + 1)

    // 使用 URLSearchParams 遍历参数
    const searchParams = new URLSearchParams(queryString)
    searchParams.forEach((value, key) => {
      // 封装进 paramsObject 对象
      paramsObject[key] = value
    })
  }

  // 返回 basePath 和 paramsObject
  return { basePath, paramsObject }
}

// 路由不重定向白名单
const whiteList = [
  '/login',
  '/MyLogin', // 外部Token登录（嵌入式场景）
  '/social-login',
  '/auth-redirect',
  '/bind',
  '/register',
  '/oauthLogin/gitee'
]

// 是否跳过登录验证（仅开发调试用）
const skipAuth = import.meta.env.VITE_SKIP_AUTH === 'true'

// 路由加载前
router.beforeEach(async (to, from, next) => {
  start()
  loadStart()

  const permissionStore = usePermissionStoreWithOut()
  const dictStore = useDictStoreWithOut()

  // ===== 开发调试模式（跳过登录验证）=====
  if (skipAuth) {
    // 初始化字典（忽略错误）
    if (!dictStore.getIsSetDict) {
      try {
        await dictStore.setDictMap()
      } catch (error) {
        console.warn('字典初始化失败:', error)
      }
    }
    // 初始化路由
    if (!permissionStore.getRouters || permissionStore.getRouters.length === 0) {
      await permissionStore.generateRoutes()
      permissionStore.getAddRouters.forEach((route) => {
        router.addRoute(route as unknown as RouteRecordRaw)
      })
    }
    next()
    return
  }
  // =========================================

  // ===== 外部Token登录模式（嵌入式场景）=====
  // 当启用外部Token登录时，支持从任意页面URL参数获取token
  if (isExternalTokenMode()) {
    // 1. 检查URL参数中是否有token，如果有则存储
    const urlToken = to.query.token as string
    if (urlToken) {
      // 存储token
      setExternalToken(urlToken)
      // 移除URL中的token参数（避免token暴露在浏览器历史记录中）
      const query = { ...to.query }
      delete query.token
      // 重定向到不带token参数的URL
      next({ path: to.path, query, replace: true })
      return
    }

    // 2. 初始化字典（忽略错误）
    if (!dictStore.getIsSetDict) {
      try {
        await dictStore.setDictMap()
      } catch (error) {
        console.warn('字典初始化失败:', error)
      }
    }

    // 3. 初始化路由
    if (!permissionStore.getRouters || permissionStore.getRouters.length === 0) {
      await permissionStore.generateRoutes()
      permissionStore.getAddRouters.forEach((route) => {
        router.addRoute(route as unknown as RouteRecordRaw)
      })
    }

    // 4. 白名单页面直接放行
    if (whiteList.indexOf(to.path) !== -1) {
      next()
      return
    }

    // 5. 有token则放行，无token则提示错误
    if (getAccessToken()) {
      next()
    } else {
      // 没有token，显示错误提示页面
      next('/MyLogin')
    }
    return
  }
  // =========================================

  // ===== 标准登录模式 =====
  if (getAccessToken()) {
    if (to.path === '/login') {
      next({ path: '/' })
    } else {
      // 获取所有字典
      const userStore = useUserStoreWithOut()
      // 异步加载字典
      if (!dictStore.getIsSetDict) {
        await dictStore.setDictMap()
      }
      if (!userStore.getIsSetUser) {
        isRelogin.show = true
        await userStore.setUserInfoAction()
        isRelogin.show = false
        // 后端过滤菜单
        await permissionStore.generateRoutes()
        permissionStore.getAddRouters.forEach((route) => {
          router.addRoute(route as unknown as RouteRecordRaw) // 动态添加可访问路由表
        })
        const redirectPath = from.query.redirect || to.path
        // 修复跳转时不带参数的问题
        const redirect = decodeURIComponent(redirectPath as string)
        const { paramsObject: query } = parseURL(redirect)
        const nextData = to.path === redirect ? { ...to, replace: true } : { path: redirect, query }
        next(nextData)
      } else {
        next()
      }
    }
  } else {
    if (whiteList.indexOf(to.path) !== -1) {
      next()
    } else {
      next(`/login?redirect=${to.fullPath}`) // 否则全部重定向到登录页
    }
  }
})

router.afterEach((to) => {
  useTitle(to?.meta?.title as string)
  done() // 结束Progress
  loadDone()
})
