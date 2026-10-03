// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import Image from './Image'
import placeholder from '../../assets/food/dish-placeholder.svg'

let root
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  document.body.innerHTML = '<div id="image-test"></div>'
  root = createRoot(document.getElementById('image-test'))
})
afterEach(async () => { await act(() => root.unmount()) })

it('falls back without losing the accessible description or swallowing caller error handling', async () => {
  const onError = vi.fn()
  await act(() => root.render(<Image src="/unavailable.webp" alt="Selected dish" onError={onError} />))
  await act(() => document.querySelector('img').dispatchEvent(new Event('error')))
  expect(document.querySelector('img').getAttribute('src')).toBe(placeholder)
  expect(document.querySelector('img').alt).toBe('Selected dish')
  expect(onError).toHaveBeenCalledOnce()
  await act(() => root.render(<Image src="/replacement.webp" alt="Selected dish" />))
  expect(document.querySelector('img').getAttribute('src')).toBe('/replacement.webp')
})
