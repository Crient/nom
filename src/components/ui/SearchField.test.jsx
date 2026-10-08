// @vitest-environment happy-dom
import { useState, act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import SearchField from './SearchField'

let root
const submit = vi.fn()
function Search() {
  const [query, setQuery] = useState('')
  return <form onSubmit={event => { event.preventDefault(); submit(query) }}>
    <SearchField placeholder="Search for food..." aria-label="Search dishes" value={query} onChange={event => setQuery(event.target.value)} onClear={() => setQuery('')} action={<button type="submit">Search</button>} />
  </form>
}
beforeEach(async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  document.body.innerHTML = '<div id="root"></div>'; root = createRoot(document.getElementById('root'))
  submit.mockClear(); await act(() => root.render(<Search />))
})
afterEach(async () => { await act(() => root.unmount()) })
async function type(value) {
  const input = document.querySelector('input')
  await act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  return input
}
describe('one portable search clear control', () => {
  it('hides the placeholder on focus and restores it after an empty blur without changing the query', async () => {
    const input = document.querySelector('input')
    expect(input.placeholder).toBe('Search for food...')
    await act(() => input.focus()); expect(input.placeholder).toBe(''); expect(input.value).toBe('')
    await type('arepa'); expect(input.placeholder).toBe(''); expect(input.value).toBe('arepa')
    await type(''); await act(() => input.blur())
    expect(input.placeholder).toBe('Search for food...'); expect(input.value).toBe('')
    expect(submit).not.toHaveBeenCalled()
  })
  it('retains caller focus and blur callbacks', async () => {
    const onFocus = vi.fn(), onBlur = vi.fn()
    await act(() => root.render(<SearchField placeholder="Food" onFocus={onFocus} onBlur={onBlur} />))
    const input = document.querySelector('input')
    await act(() => input.focus()); expect(input.placeholder).toBe(''); expect(onFocus).toHaveBeenCalledTimes(1)
    await act(() => input.blur()); expect(input.placeholder).toBe('Food'); expect(onBlur).toHaveBeenCalledTimes(1)
  })
  it('has no clear control for an empty query and cannot acquire native search chrome', () => {
    expect(document.querySelector('[aria-label="Clear search"]')).toBeNull()
    expect(document.querySelector('[role="searchbox"]').type).toBe('text')
    expect(document.querySelector('input').getAttribute('inputmode')).toBe('search')
  })
  it('shows exactly one clear control, clears without submitting, and retains typing focus', async () => {
    const input = await type('arepa')
    expect(document.querySelectorAll('[aria-label="Clear search"]')).toHaveLength(1)
    await act(() => document.querySelector('[aria-label="Clear search"]').click())
    expect(input.value).toBe(''); expect(document.activeElement).toBe(input)
    expect(document.querySelector('[aria-label="Clear search"]')).toBeNull()
    expect(submit).not.toHaveBeenCalled()
  })
  it('keeps query submission through the form and the optional arrow separate from clearing', async () => {
    await type('arepa')
    await act(() => document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    expect(submit).toHaveBeenCalledWith('arepa')
    await act(() => document.querySelector('button[type="submit"]').click())
    expect(submit).toHaveBeenCalledTimes(2)
    expect(document.querySelector('input').value).toBe('arepa')
  })
})
