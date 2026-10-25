import { afterAll, describe, expect, it } from 'vitest'
// 直接用全局 i18n（本套件单独跑，语言切换不影响其他文件）。
import i18n from '@/i18n'
import { formatNotebookDate } from './formatNotebookDate'

describe('formatNotebookDate', () => {
  const originalLanguage = i18n.language
  afterAll(() => {
    void i18n.changeLanguage(originalLanguage)
  })

  it('无效时间戳返回占位文案', () => {
    expect(formatNotebookDate(0)).toBe('未知日期')
  })

  it('中文界面下返回 zh-CN 日期', async () => {
    await i18n.changeLanguage('zh')
    const date = Date.UTC(2025, 6, 18, 8, 0, 0)
    const label = formatNotebookDate(date)

    expect(label).toMatch(/2025年/)
    expect(label).toMatch(/7月18日/)
  })

  it('英文界面下返回 en-US 短月日期', async () => {
    await i18n.changeLanguage('en')
    const date = Date.UTC(2025, 6, 18, 8, 0, 0)
    const label = formatNotebookDate(date)

    expect(label).toMatch(/Jul/)
    expect(label).toMatch(/2025/)
  })
})
