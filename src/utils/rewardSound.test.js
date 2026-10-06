import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRewardSound, REWARD_SOUND_PROFILES } from './rewardSound'

let Audio, context, sound, nodes
beforeEach(() => {
  vi.useFakeTimers(); nodes = []
  const gain = () => ({ gain: { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() })
  context = { currentTime: 10, destination: {}, resume: vi.fn().mockResolvedValue(), createGain: vi.fn(gain),
    createOscillator: vi.fn(() => { const node = { frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn() }; nodes.push(node); return node }) }
  Audio = vi.fn(function () { return context }); sound = createRewardSound({ getAudioContext: () => Audio })
})
afterEach(() => { sound.stop(); vi.useRealTimers() })
describe('optional original reward chime', () => {
  it('creates no audio context while muted or with reduced motion', () => {
    expect(sound.play()).toBe(false)
    expect(sound.play({ enabled: true, reducedMotion: true })).toBe(false)
    expect(Audio).not.toHaveBeenCalled()
  })
  it('schedules a quiet short chime after an enabled Open interaction', () => {
    expect(sound.play({ enabled: true, delayMs: 1080, rarity: 'rare' })).toBe(true)
    expect(Audio).toHaveBeenCalledTimes(1); expect(context.resume).toHaveBeenCalledTimes(1)
    expect(nodes).toHaveLength(2)
    expect(nodes[0].start).toHaveBeenCalledWith(11.08)
    expect(nodes.at(-1).stop.mock.calls[0][0]).toBeLessThan(12)
    expect(context.createGain.mock.results[0].value.gain.value).toBe(.3)
  })
  it.each([['common', .5, .7], ['rare', .7, .9], ['epic', .9, 1.2], ['legendary', 1.2, 1.6]])('schedules the original %s profile within its duration range', (rarity, min, max) => {
    sound.play({ enabled: true, delayMs: 0, rarity })
    const finish = Math.max(...nodes.map(node => node.stop.mock.calls[0][0])) - context.currentTime
    expect(finish).toBeGreaterThanOrEqual(min); expect(finish).toBeLessThanOrEqual(max)
    expect(nodes.map(node => node.frequency.setValueAtTime.mock.calls[0][0])).toEqual(REWARD_SOUND_PROFILES[rarity].map(note => note[0]))
    expect(nodes.map(node => node.start.mock.calls[0][0] - 10)).toEqual(expect.arrayContaining(REWARD_SOUND_PROFILES[rarity].map(note => expect.closeTo(note[1], 5))))
    vi.advanceTimersByTime(2000)
    expect(nodes.every(node => node.disconnect.mock.calls.length === 1)).toBe(true)
  })
  it('stops and disconnects scheduled notes on mute or abandonment', () => {
    sound.play({ enabled: true }); sound.stop()
    expect(nodes.every(node => node.stop.mock.calls.length === 2 && node.disconnect.mock.calls.length === 1)).toBe(true)
    vi.advanceTimersByTime(5000)
    expect(nodes.every(node => node.disconnect.mock.calls.length === 1)).toBe(true)
  })
  it('does not block rewards when audio is absent or the context cannot start', async () => {
    const missing = createRewardSound({ getAudioContext: () => undefined })
    expect(missing.play({ enabled: true })).toBe(false)
    context.resume.mockRejectedValue(new Error('Audio blocked'))
    expect(sound.play({ enabled: true })).toBe(true)
    await Promise.resolve()
    expect(nodes.every(node => node.disconnect.mock.calls.length === 1)).toBe(true)
  })
  it('cleans up after the one-shot chime and reuses the context for a later deliberate opening', () => {
    sound.play({ enabled: true }); vi.advanceTimersByTime(1680)
    expect(nodes.every(node => node.disconnect.mock.calls.length === 1)).toBe(true)
    sound.play({ enabled: true }); expect(Audio).toHaveBeenCalledTimes(1)
  })
  it('does not let a previous resume rejection silence a later deliberate opening', async () => {
    let rejectFirst
    context.resume.mockImplementationOnce(() => new Promise((_, reject) => { rejectFirst = reject }))
    sound.play({ enabled: true })
    sound.play({ enabled: true })
    const second = nodes.slice(1)
    expect(second).toHaveLength(1)
    rejectFirst(new Error('Old opening abandoned'))
    await Promise.resolve()
    expect(second.every(node => node.disconnect.mock.calls.length === 0)).toBe(true)
    sound.stop()
    expect(second.every(node => node.disconnect.mock.calls.length === 1)).toBe(true)
  })
})
