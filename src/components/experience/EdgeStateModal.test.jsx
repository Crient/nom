// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import EdgeStateModal from './EdgeStateModal'

let root
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  document.body.innerHTML = '<button id="trigger">Open dialog</button><div id="root"></div>'
  document.getElementById('trigger').focus()
  root = createRoot(document.getElementById('root'))
})
afterEach(async () => { await act(() => root.unmount()) })

describe('compact edge-state dialogs', () => {
  it.each(['progress', 'counted', 'failed', 'feedback'])('keeps %s actions outside the scroll body and preserves focus trapping/return', async kind => {
    const close = vi.fn()
    await act(() => root.render(<EdgeStateModal kind={kind} onClose={close} />))
    const dialog = document.querySelector('[role="dialog"]')
    const content = dialog.querySelector('.edge-scroll'), footer = dialog.querySelector('.edge-footer')
    expect(content.querySelector('h2').id).toBe(dialog.getAttribute('aria-labelledby'))
    expect(footer.querySelector('button')).toBeTruthy()
    expect(content.contains(footer)).toBe(false)
    expect(content.contains(dialog.querySelector('[aria-label="Close dialog"]'))).toBe(false)
    expect(document.activeElement).toBe(dialog)
    expect(document.body.style.overflow).toBe('hidden')
    await act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })))
    expect(document.activeElement.getAttribute('aria-label')).toBe('Close dialog')
    await act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })))
    expect(document.activeElement).toBe(footer.querySelector('button:last-child'))
    await act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    expect(close).toHaveBeenCalledOnce()
    await act(() => root.render(<EdgeStateModal kind={null} onClose={close} />))
    expect(document.activeElement.id).toBe('trigger')
    expect(document.body.style.overflow).toBe('')
  })
})
