/**
 * 红头文件模板
 * 提供各类红头文件的 HTML 模板
 */

import type { RedHeaderType, RedHeaderTemplateParams } from './types'

/**
 * 生成红色横线 HTML
 * @param width 宽度百分比
 * @returns 红色横线 HTML
 */
export const createRedLine = (width = 100): string => {
  return `<hr style="border: none; border-top: 2px solid #ff0000; width: ${width}%; margin: 10px auto;" data-line-color="red" class="red-line" />`
}

/**
 * 简易红头文件模板
 * @param params 模板参数
 * @returns 红头文件 HTML
 */
export const createSimpleRedHeader = (params: RedHeaderTemplateParams): string => {
  const { organization, title, documentNumber, date } = params

  return `
<div style="text-align: center;">
  <h1 style="color: #ff0000; font-size: 24pt; font-weight: bold; font-family: 方正小标宋简体, 宋体, serif; letter-spacing: 2px; margin-bottom: 20px;">
    ${organization}
  </h1>
  <p style="font-size: 16pt; text-align: center;">
    <span style="font-family: 仿宋, FangSong, serif;">文号：${documentNumber}</span>
  </p>
</div>
${createRedLine()}
<h2 style="text-align: center; font-size: 18pt; font-weight: bold; margin: 20px 0;">
  ${title}
</h2>
<p style="text-align: right; font-family: 仿宋, FangSong, serif;">
  ${date}
</p>
`.trim()
}

/**
 * 标准政府公文红头文件模板
 * @param params 模板参数
 * @returns 红头文件 HTML
 */
export const createGovernmentRedHeader = (params: RedHeaderTemplateParams): string => {
  const {
    organization,
    title,
    documentNumber,
    date,
    recipient = '',
    securityLevel = '',
    urgencyLevel = ''
  } = params

  const secretRow = securityLevel || urgencyLevel
    ? `<tr>
        <td style="text-align: left; font-family: 黑体, SimHei, sans-serif; font-size: 16pt;">
          ${securityLevel ? `<span style="border: 1px solid #000;">${securityLevel}</span>` : ''}
        </td>
        <td></td>
        <td style="text-align: right; font-family: 黑体, SimHei, sans-serif; font-size: 16pt;">
          ${urgencyLevel ? `<span style="border: 1px solid #000;">${urgencyLevel}</span>` : ''}
        </td>
      </tr>`
    : ''

  return `
<table style="width: 100%; border-collapse: collapse;">
  ${secretRow}
  <tr>
    <td colspan="3" style="text-align: center; padding: 20px 0;">
      <h1 style="color: #ff0000; font-size: 22pt; font-weight: bold; font-family: 方正小标宋简体, 宋体, serif; letter-spacing: 10px; margin: 0;">
        ${organization}
      </h1>
    </td>
  </tr>
  <tr>
    <td colspan="3" style="text-align: center; padding-bottom: 10px;">
      <span style="font-size: 16pt; font-family: 仿宋, FangSong, serif; letter-spacing: 1px;">
        ${documentNumber}
      </span>
    </td>
  </tr>
</table>
${createRedLine()}
<h2 style="text-align: center; font-size: 18pt; font-weight: bold; font-family: 方正小标宋简体, 宋体, serif; margin: 20px 0;">
  ${title}
</h2>
${recipient ? `<p style="font-family: 仿宋, FangSong, serif; font-size: 16pt;">${recipient}：</p>` : ''}
<p style="text-align: right; font-family: 仿宋, FangSong, serif; font-size: 16pt; margin-top: 20px;">
  ${date}
</p>
`.trim()
}

/**
 * 党组织公文红头文件模板
 * @param params 模板参数
 * @returns 红头文件 HTML
 */
export const createPartyRedHeader = (params: RedHeaderTemplateParams): string => {
  const { organization, title, documentNumber, date, recipient = '' } = params

  return `
<div style="text-align: center; position: relative;">
  <p style="text-align: left; position: absolute; left: 0; top: 0;">
    <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%23ff0000'/%3E%3Ctext x='50' y='55' text-anchor='middle' fill='%23fff' font-size='24'%3E★%3C/text%3E%3C/svg%3E" alt="党徽" style="width: 40px; height: 40px;" />
  </p>
  <h1 style="color: #ff0000; font-size: 24pt; font-weight: bold; font-family: 方正小标宋简体, 宋体, serif; letter-spacing: 5px; margin: 10px 0 20px;">
    ${organization}
  </h1>
  <p style="font-size: 16pt; font-family: 仿宋, FangSong, serif;">
    ${documentNumber}
  </p>
</div>
${createRedLine()}
<h2 style="text-align: center; font-size: 18pt; font-weight: bold; margin: 20px 0;">
  ${title}
</h2>
${recipient ? `<p style="font-family: 仿宋, FangSong, serif; font-size: 16pt;">${recipient}：</p>` : ''}
<p style="text-align: right; font-family: 仿宋, FangSong, serif; font-size: 16pt; margin-top: 20px;">
  ${date}
</p>
`.trim()
}

/**
 * 根据类型创建红头文件
 * @param type 红头文件类型
 * @param params 模板参数
 * @returns 红头文件 HTML
 */
export const createRedHeader = (
  type: RedHeaderType,
  params: RedHeaderTemplateParams
): string => {
  switch (type) {
    case 'party':
      return createPartyRedHeader(params)
    case 'government':
      return createGovernmentRedHeader(params)
    case 'military':
      // 军用公文暂时使用政府公文模板
      return createGovernmentRedHeader(params)
    case 'custom':
    default:
      return createSimpleRedHeader(params)
  }
}
