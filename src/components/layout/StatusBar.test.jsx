// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import StatusBar from './StatusBar'
import AppShell from './AppShell'

let root
beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; document.body.innerHTML = '<div id="root"></div>'; root = createRoot(document.getElementById('root')) })
afterEach(async () => { await act(() => root.unmount()); vi.unstubAllEnvs() })
async function render() { await act(() => root.render(<AppShell><StatusBar /></AppShell>)) }
describe('explicit local Figma device chrome', () => {
  it('keeps ordinary dev free of fake time, radios, battery and preview header insets', async () => {
    vi.stubEnv('DEV', true); vi.stubEnv('VITE_NOM_DESIGN_PREVIEW', '')
    await render()
    expect(document.querySelector('[data-chrome="web"]')).toBeTruthy()
    expect(document.querySelector('[data-status-bar="safe-area"]').children).toHaveLength(0)
    expect(document.body.textContent).not.toContain('9:41')
  })
  it('enables both the chrome and its matching inset only in explicit local preview', async () => {
    vi.stubEnv('DEV', true); vi.stubEnv('VITE_NOM_DESIGN_PREVIEW', 'true')
    await render()
    expect(document.querySelector('[data-chrome="preview"]')).toBeTruthy()
    expect(document.querySelector('[data-status-bar="preview"] img')).toBeTruthy()
    expect(document.body.textContent).toContain('9:41')
  })
  it('ignores preview configuration and component props in a production build', async () => {
    vi.stubEnv('DEV', false); vi.stubEnv('VITE_NOM_DESIGN_PREVIEW', 'true')
    await act(() => root.render(<AppShell><StatusBar preview /></AppShell>))
    expect(document.querySelector('[data-chrome="web"]')).toBeTruthy()
    expect(document.querySelector('[data-status-bar="preview"]')).toBeNull()
    expect(document.body.textContent).toBe('')
  })
})
