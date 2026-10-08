// @vitest-environment happy-dom
import { StrictMode, useCallback, useState, act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import VerifyVisit from './VerifyVisit'
import { ExperiencePreviewProvider, useExperience } from '../context/Experience'
import { createExperienceState, experienceReducer } from '../data/experienceState'
import { verifiedFixture } from '../test/verificationFixtures'
import { createVisitVerificationApi, receiptUpload } from '../data/liveVisitVerification'
import { dishes } from '../data/dishes'

vi.mock('../data/liveVisitVerification', async original => ({ ...await original(), createVisitVerificationApi: vi.fn(), receiptUpload: vi.fn() }))
vi.mock('../context/Auth', () => ({ useAuth: () => ({ isAuthenticated: false }) }))
vi.mock('../hooks/useVisit', () => ({ useVisit: id => {
  const { state } = useExperience()
  return { visit: state.drafts[id], dish: dishes.find(dish => dish.id === 'lort-cha'),
    restaurant: { id: 'google:trusted-place', name: 'Casa Portugal', source: 'google-places', metadataOnly: true }, status: 'ready' }
} }))
const id = '00000000-0000-4000-8000-000000000001'
const draft = { id, dishId: 'lort-cha', restaurantId: 'google:trusted-place', countryCode: 'KH', startedAt: '2026-10-07T12:00:00Z' }
let root, api, geolocation, snapshot
const position = () => ({ coords: { latitude: 42, longitude: -71, accuracy: 8 }, timestamp: Date.now() })
const signed = method => ({ result: 'verified', verification: verifiedFixture({ ...draft, method, at: '2026-10-07T12:00:00Z' }) })
function Journey() {
  const [state, setState] = useState(() => experienceReducer(createExperienceState(), { type: 'start', draft }))
  const verifyVisit = useCallback((id, verification) => setState(state => experienceReducer(state, { type: 'verify', id, verification })), [])
  snapshot = state
  return <ExperiencePreviewProvider value={{ state, verifyVisit }}><MemoryRouter initialEntries={[`/visits/${id}/verify`]}><Routes>
    <Route path="/visits/:visitId/verify" element={<VerifyVisit />} />
    <Route path="/visits/:visitId/feedback" element={<h1>Feedback</h1>} />
  </Routes></MemoryRouter></ExperiencePreviewProvider>
}
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  document.body.innerHTML = '<div id="root"></div>'; root = createRoot(document.getElementById('root'))
  geolocation = { getCurrentPosition: vi.fn(ok => ok(position())) }
  vi.stubGlobal('navigator', { geolocation })
  api = { capabilities: vi.fn(async () => ({ location: true, receipt: false, qr: false })), verify: vi.fn(async () => signed('location')) }
  createVisitVerificationApi.mockReturnValue(api)
  receiptUpload.mockResolvedValue({ type: 'image/jpeg', base64: 'test-only' })
})
afterEach(async () => { await act(() => root.unmount()); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers() })
async function render(strict = false) { await act(() => root.render(strict ? <StrictMode><Journey /></StrictMode> : <Journey />)) }
async function click(label) {
  const button = [...document.querySelectorAll('button')].find(node => node.textContent === label || node.querySelector('strong')?.textContent === label)
  expect(button, label).toBeTruthy(); await act(() => button.click())
}
const proceed = () => document.querySelector('.flow-cta button')
const fallback = () => click('Couldn’t verify automatically?')

describe('automatic entry → location evidence → signed verification → feedback', () => {
  it('automatically verifies granted permission with fresh samples and enables Continue', async () => {
    navigator.permissions = { query: vi.fn(async () => ({ state: 'granted' })) }
    await render()
    expect(geolocation.getCurrentPosition).toHaveBeenCalledTimes(3)
    expect(api.verify).toHaveBeenCalledTimes(1)
    expect(api.verify).toHaveBeenCalledWith(expect.objectContaining({ id }), 'location', { samples: expect.any(Array) }, expect.any(AbortSignal))
    expect(document.body.textContent).toContain('You are near Casa Portugal.')
    expect(document.body.textContent).toContain('About 42 m away')
    expect(document.body.textContent).toContain('Your visit has been verified.')
    expect(document.querySelectorAll('.verify-check-green')).toHaveLength(3)
    expect(proceed().disabled).toBe(false)
    expect(document.body.textContent).not.toMatch(/Verify my location|Verify with location|17 minutes|within 200m/)
    await click('Continue'); expect(document.querySelector('h1').textContent).toBe('Feedback')
  })
  it('keeps checking unresolved while readiness is loading, then begins automatically', async () => {
    let ready; api.capabilities.mockImplementation(() => new Promise(resolve => { ready = resolve }))
    await render()
    expect(proceed().disabled).toBe(true); expect(geolocation.getCurrentPosition).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('Checking your location…')
    await act(() => ready({ location: true }))
    expect(api.verify).toHaveBeenCalledTimes(1); expect(proceed().disabled).toBe(false)
  })
  it('waits for a permission prompt without treating prompt time as acquisition timeout', async () => {
    vi.useFakeTimers()
    const permission = new EventTarget(); permission.state = 'prompt'
    navigator.permissions = { query: vi.fn(async () => permission) }
    let allow; geolocation.getCurrentPosition.mockImplementationOnce(ok => { allow = ok })
    await render()
    expect(document.body.textContent).toContain('Waiting for location permission…')
    expect(proceed().disabled).toBe(true)
    await act(() => vi.advanceTimersByTimeAsync(12000))
    expect(document.body.textContent).toContain('Waiting for location permission…')
    expect(api.verify).not.toHaveBeenCalled()
    await act(() => { permission.state = 'granted'; permission.dispatchEvent(new Event('change')); allow(position()) })
    expect(api.verify).toHaveBeenCalledTimes(1); expect(proceed().disabled).toBe(false)
  })
  it('times out bounded acquisition after known permission grant without enabling Continue', async () => {
    vi.useFakeTimers()
    navigator.permissions = { query: vi.fn(async () => ({ state: 'granted' })) }
    geolocation.getCurrentPosition.mockImplementation(() => {})
    await render(); await act(() => vi.advanceTimersByTimeAsync(13000))
    expect(document.body.textContent).toContain('The location check timed out.')
    expect(geolocation.getCurrentPosition).toHaveBeenCalledTimes(3)
    expect(api.verify).not.toHaveBeenCalled(); expect(proceed().disabled).toBe(true)
  })
  it('cancels unresolved permission on fallback and ignores a late browser reading', async () => {
    const permission = new EventTarget(); permission.state = 'prompt'
    navigator.permissions = { query: vi.fn(async () => permission) }
    let reading; geolocation.getCurrentPosition.mockImplementation(ok => { reading = ok })
    await render(); await fallback(); await click('Log without verification'); await click('Save without verification')
    await act(() => { permission.state = 'granted'; permission.dispatchEvent(new Event('change')); reading(position()) })
    expect(api.verify).not.toHaveBeenCalled(); expect(geolocation.getCurrentPosition).toHaveBeenCalledTimes(1)
    expect(snapshot.drafts[id].verification).toMatchObject({ verified: false, method: 'none' })
    expect(document.querySelector('h1').textContent).toBe('Feedback')
  })
  it('reports previously denied permission without another GPS or server request', async () => {
    navigator.permissions = { query: vi.fn(async () => ({ state: 'denied' })) }
    await render()
    expect(document.body.textContent).toContain('Location permission denied.')
    expect(geolocation.getCurrentPosition).not.toHaveBeenCalled(); expect(api.verify).not.toHaveBeenCalled()
    expect(proceed().disabled).toBe(true)
  })
  it.each([
    ['too_far', 'You appear to be too far'], ['poor_accuracy', 'Your location accuracy is too low'],
    ['timeout', 'The location check timed out'], ['location_unavailable', 'Your location is unavailable'],
    ['server_error', 'The visit check couldn’t complete'],
  ])('keeps the map/status framework and fallback after %s, with a separate retry', async (result, text) => {
    api.verify.mockResolvedValue({ result }); await render()
    expect(document.body.textContent).toContain(text); expect(proceed().disabled).toBe(true)
    expect(snapshot.drafts[id].verification).toBeUndefined()
    expect(document.querySelectorAll('.verify-check')).toHaveLength(3)
    expect(document.querySelector('.visit-map')).toBeTruthy()
    expect(document.querySelector('.verify-alternative').textContent).toBe('Couldn’t verify automatically?')
    await click('Try location again'); expect(api.verify).toHaveBeenCalledTimes(2)
  })
  it.each([[1, 'Location permission denied.'], [3, 'The location check timed out.']])('handles browser location error %s before contacting the server', async (code, text) => {
    geolocation.getCurrentPosition.mockImplementation((_, fail) => fail({ code }))
    await render(); expect(document.body.textContent).toContain(text)
    expect(api.verify).not.toHaveBeenCalled(); expect(proceed().disabled).toBe(true)
  })
  it('rejects poor GPS accuracy before submitting evidence', async () => {
    geolocation.getCurrentPosition.mockImplementation(ok => ok({ ...position(), coords: { ...position().coords, accuracy: 999 } }))
    await render(); expect(document.body.textContent).toContain('Your location accuracy is too low.')
    expect(api.verify).not.toHaveBeenCalled(); expect(proceed().disabled).toBe(true)
  })
  it('does not acquire GPS when signed verification is unconfigured', async () => {
    api.capabilities.mockResolvedValue({ location: false, qr: false, receipt: false })
    await render(); expect(document.body.textContent).toContain('Location verification is currently unavailable.')
    expect(document.body.textContent).toContain('Location was not checked.')
    expect(document.body.textContent).toContain('Use another option to log your visit.')
    expect(document.body.textContent).not.toContain('We couldn’t confirm your location.')
    expect(geolocation.getCurrentPosition).not.toHaveBeenCalled(); expect(api.verify).not.toHaveBeenCalled()
    expect(proceed().disabled).toBe(true)
    await click('Try location again'); expect(geolocation.getCurrentPosition).not.toHaveBeenCalled()
  })
  it('prevents duplicate automatic attempts on ordinary rerender and React StrictMode', async () => {
    await render(true); await render(true)
    expect(geolocation.getCurrentPosition).toHaveBeenCalledTimes(3); expect(api.verify).toHaveBeenCalledTimes(1)
  })
  it('fails closed on forged or tampered signed evidence', async () => {
    api.verify.mockResolvedValue({ result: 'verified', verification: { ...signed('location').verification, distanceMeters: 0 } })
    await render()
    expect(document.body.textContent).not.toContain('Your visit has been verified.')
    expect(proceed().disabled).toBe(true); expect(snapshot.drafts[id].verification).toBeUndefined()
  })
  it('discards late success after fallback cancellation and manual logging', async () => {
    let finish; api.verify.mockImplementation(() => new Promise(resolve => { finish = resolve }))
    await render(); expect(proceed().disabled).toBe(true)
    const signal = api.verify.mock.calls[0][3]
    await fallback(); expect(signal.aborted).toBe(true)
    await click('Log without verification'); await click('Save without verification')
    await act(() => finish(signed('location')))
    expect(document.querySelector('h1').textContent).toBe('Feedback')
    expect(snapshot.drafts[id].verification).toMatchObject({ verified: false, method: 'none' })
    expect(snapshot.progress.cambodia).toEqual({ meals: 0, count: 0 }); expect(snapshot.boxes).toEqual({})
  })
})

describe('fallback offers QR, receipt and history only; location retry stays outside', () => {
  it.each([
    ['Scan restaurant QR code', 'This restaurant doesn’t currently support Nom QR verification.'],
    ['Scan receipt', 'Receipt verification cannot currently complete here.'],
  ])('selects unavailable %s honestly after showing product actions', async (label, message) => {
    api.capabilities.mockResolvedValue({ location: false, qr: false, receipt: false })
    await render(); await fallback()
    const dialog = document.querySelector('[role="dialog"]')
    expect(dialog.textContent).toContain('We couldn’t verify your visit automatically')
    expect([...dialog.querySelectorAll('.edge-options strong')].map(node => node.textContent)).toEqual(['Scan restaurant QR code', 'Scan receipt', 'Log without verification'])
    expect(dialog.textContent).not.toMatch(/Verify with location|currently unavailable|not configured/)
    expect([...dialog.querySelectorAll('.edge-options small')].map(node => node.textContent)).toEqual([
      'For partnered restaurants', 'Take or import a photo of your receipt', 'Save to history without adding progress',
    ])
    await click(label)
    expect(document.querySelector('[role="dialog"]')).toBeNull(); expect(document.body.textContent).toContain(message)
    expect(geolocation.getCurrentPosition).not.toHaveBeenCalled(); expect(api.verify).not.toHaveBeenCalled()
    expect(receiptUpload).not.toHaveBeenCalled(); expect(document.querySelector('video')).toBeNull()
    expect(document.querySelector('input[type="file"]')).toBeNull(); expect(proceed().disabled).toBe(true)
  })
  it('saves manual verification only on explicit confirmation', async () => {
    api.capabilities.mockResolvedValue({ location: false })
    await render(); await fallback(); await click('Log without verification')
    expect(snapshot.drafts[id].verification).toBeUndefined(); expect(document.querySelector('h1').textContent).toBe('Verify Your Visit')
    await click('Save without verification')
    expect(document.querySelector('h1').textContent).toBe('Feedback')
    expect(snapshot.drafts[id].verification).toMatchObject({ verified: false, method: 'none', status: 'unverified' })
  })
  it('processes a configured receipt and enables Continue only for its signed result', async () => {
    api.capabilities.mockResolvedValue({ location: true, receipt: true, qr: false })
    let finishUpload, finishVerification
    api.verify.mockResolvedValueOnce({ result: 'too_far' }).mockImplementation(() => new Promise(resolve => { finishVerification = resolve }))
    receiptUpload.mockImplementation(() => new Promise(resolve => { finishUpload = resolve }))
    await render(); await fallback(); await click('Scan receipt')
    const input = document.querySelector('input[type="file"]')
    Object.defineProperty(input, 'files', { configurable: true, value: [new File(['fixture'], 'receipt.jpg', { type: 'image/jpeg' })] })
    await act(() => input.dispatchEvent(new Event('change', { bubbles: true })))
    expect(document.body.textContent).toContain('Uploading receipt…'); expect(proceed().disabled).toBe(true)
    await act(() => finishUpload({ type: 'image/jpeg', base64: 'test-only' }))
    expect(document.body.textContent).toContain('Processing your receipt…')
    expect(api.verify).toHaveBeenLastCalledWith(expect.objectContaining({ id }), 'receipt', expect.objectContaining({ receipt: expect.any(Object) }), expect.any(AbortSignal))
    await act(() => finishVerification(signed('receipt')))
    expect(document.body.textContent).toContain('Receipt verified'); expect(proceed().disabled).toBe(false)
    expect(snapshot.drafts[id].verification.method).toBe('receipt'); expect(snapshot.drafts[id]).not.toHaveProperty('receipt')
    expect(document.querySelectorAll('.verify-check-green')).toHaveLength(1) // No invented location match.
  })
  it.each([['invalid_code', false], ['verified', true]])('configured QR camera passes evidence to server and handles %s', async (result, accepted) => {
    api.capabilities.mockResolvedValue({ location: true, qr: true })
    api.verify.mockResolvedValueOnce({ result: 'too_far' }).mockResolvedValue(accepted ? signed('qr') : { result })
    const stop = vi.fn(), getUserMedia = vi.fn(async () => ({ getTracks: () => [{ stop }] }))
    navigator.mediaDevices = { getUserMedia }
    vi.spyOn(HTMLMediaElement.prototype, 'srcObject', 'set').mockImplementation(() => {})
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    vi.stubGlobal('BarcodeDetector', class { async detect() { return [{ rawValue: 'controlled-QR-evidence' }] } })
    await render(); await fallback(); await click('Scan restaurant QR code')
    expect(getUserMedia).toHaveBeenCalledTimes(1)
    expect(document.body.textContent).not.toContain('Camera access was denied or unavailable.')
    await act(async () => { await Promise.resolve(); await Promise.resolve() })
    expect(api.verify).toHaveBeenLastCalledWith(expect.objectContaining({ id }), 'qr', { qrToken: 'controlled-QR-evidence' }, expect.any(AbortSignal))
    expect(proceed().disabled).toBe(!accepted)
    expect(snapshot.drafts[id].verification?.verified ?? false).toBe(accepted)
    expect(stop).toHaveBeenCalled()
  })
})
