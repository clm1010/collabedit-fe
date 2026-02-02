import { useCache, CACHE_KEY } from '@/hooks/web/useCache'
import { TokenType } from '@/api/login/types'
import { decrypt, encrypt } from '@/utils/jsencrypt'

const { wsCache } = useCache()

const AccessTokenKey = 'ACCESS_TOKEN'
const RefreshTokenKey = 'REFRESH_TOKEN'

// 获取token
export const getAccessToken = () => {
  // 此处与TokenKey相同，此写法解决初始化时Cookies中不存在TokenKey报错
  const accessToken = wsCache.get(AccessTokenKey)
  return accessToken ? accessToken : wsCache.get('ACCESS_TOKEN')
}

// 刷新token
export const getRefreshToken = () => {
  return wsCache.get(RefreshTokenKey)
}

// 设置token
export const setToken = (token: TokenType) => {
  wsCache.set(RefreshTokenKey, token.refreshToken)
  wsCache.set(AccessTokenKey, token.accessToken)
}

// 删除token
export const removeToken = () => {
  wsCache.delete(AccessTokenKey)
  wsCache.delete(RefreshTokenKey)
}

// ========== 外部Token登录（嵌入式场景）==========

// 【已删除】外部Token默认过期时间设置，改为依赖后端 JWT 校验
// const EXTERNAL_TOKEN_EXPIRE = 8 * 60 * 60

/**
 * 设置外部token（用于嵌入式场景）
 * 【优化】不设置前端过期时间，完全依赖后端 JWT 校验
 * @param token - 外部系统传递的token
 */
export const setExternalToken = (token: string) => {
  // 不设置过期时间，由后端 JWT 控制有效性
  wsCache.set(AccessTokenKey, token)
}

/**
 * 判断是否为外部token登录模式
 * 通过环境变量 VITE_EXTERNAL_TOKEN_LOGIN 控制
 */
export const isExternalTokenMode = () => {
  return import.meta.env.VITE_EXTERNAL_TOKEN_LOGIN === 'true'
}

/**
 * 清除外部token（退出登录时调用）
 */
export const clearExternalToken = () => {
  wsCache.delete(AccessTokenKey)
}

/** 格式化token（jwt格式） */
export const formatToken = (token: string): string => {
  return 'Bearer ' + token
}
// ========== 账号相关 ==========

export type LoginFormType = {
  tenantName: string
  username: string
  password: string
  rememberMe: boolean
}

export const getLoginForm = () => {
  const loginForm: LoginFormType = wsCache.get(CACHE_KEY.LoginForm)
  if (loginForm) {
    loginForm.password = decrypt(loginForm.password) as string
  }
  return loginForm
}

export const setLoginForm = (loginForm: LoginFormType) => {
  loginForm.password = encrypt(loginForm.password) as string
  wsCache.set(CACHE_KEY.LoginForm, loginForm, { exp: 30 * 24 * 60 * 60 })
}

export const removeLoginForm = () => {
  wsCache.delete(CACHE_KEY.LoginForm)
}

// ========== 租户相关 ==========

export const getTenantId = () => {
  return wsCache.get(CACHE_KEY.TenantId)
}

export const setTenantId = (tenantId: number) => {
  wsCache.set(CACHE_KEY.TenantId, tenantId)
}

export const getVisitTenantId = () => {
  return wsCache.get(CACHE_KEY.VisitTenantId)
}

export const setVisitTenantId = (visitTenantId: number) => {
  wsCache.set(CACHE_KEY.VisitTenantId, visitTenantId)
}
