const SOUND_KEY = 'nom.reward-sound.v1'
export function rewardSoundEnabled() {
  try { return globalThis.localStorage?.getItem(SOUND_KEY) !== 'off' } catch { return true }
}
export function saveRewardSoundPreference(enabled) {
  try { globalThis.localStorage?.setItem(SOUND_KEY, enabled ? 'on' : 'off') } catch { /* Sound stays optional. */ }
}

// Original synthesized one-shots; no sampled or third-party game audio.
// frequency, offset seconds, duration seconds, peak gain, waveform, end frequency
export const REWARD_SOUND_PROFILES = {
  // Warm impact + two-note glass ping.
  common: [[330, 0, .18, .025, 'sine', 165], [1174.66, .02, .36, .028, 'triangle'], [1568, .13, .42, .014, 'sine']],
  // Brighter rising three-note answer with a resonant low transient.
  rare: [[220, 0, .26, .035, 'sine', 110], [1318.51, .02, .44, .028, 'triangle'], [1568, .16, .5, .024, 'triangle'], [2093, .32, .6, .015, 'sine']],
  // Rounded bass drop under an ascending, layered crystal chord.
  epic: [[196, 0, .45, .045, 'sine', 98], [783.99, .04, .6, .02, 'sine'], [1568, .12, .65, .026, 'triangle'],
    [2093, .28, .7, .02, 'triangle'], [2637, .45, .75, .012, 'sine']],
  // Broad low impact, major ascent and two soft high harmonic tails.
  legendary: [[164.81, 0, .65, .05, 'sine', 82.4], [523.25, .04, .8, .022, 'sine'], [783.99, .08, .6, .022, 'triangle'],
    [1046.5, .22, .7, .025, 'triangle'], [1318.51, .38, .8, .025, 'triangle'], [1568, .54, .95, .026, 'triangle'],
    [2093, .68, 1.05, .014, 'sine'], [3136, .82, .9, .008, 'sine']],
}

/** Play only from Open, replay, or unmute gestures. All boxes share the mute preference. */
export function createRewardSound({ getAudioContext = () => globalThis.AudioContext ?? globalThis.webkitAudioContext } = {}) {
  let context, nodes = [], timer, generation = 0
  const stop = () => {
    generation += 1
    clearTimeout(timer)
    for (const node of nodes) {
      try { node.stop?.() } catch { /* Already ended. */ }
      try { node.disconnect() } catch { /* Already disconnected. */ }
    }
    nodes = []
  }
  return {
    stop,
    play({ enabled = false, reducedMotion = false, delayMs = 0, rarity = 'common', onUnavailable } = {}) {
      if (!enabled || reducedMotion) return false
      try {
        const Audio = getAudioContext()
        if (!Audio) return false
        stop(); context ??= new Audio()
        const playing = generation
        // Resume synchronously inside the user gesture, before route navigation.
        Promise.resolve(context.resume()).catch(() => { if (generation === playing) { stop(); onUnavailable?.() } })
        const start = context.currentTime + delayMs / 1000
        const master = context.createGain(); master.gain.value = .3; master.connect(context.destination); nodes.push(master)
        const profile = Object.hasOwn(REWARD_SOUND_PROFILES, rarity) ? REWARD_SOUND_PROFILES[rarity] : REWARD_SOUND_PROFILES.common
        profile.forEach(([frequency, offset, duration, gain, type, endFrequency]) => {
          const oscillator = context.createOscillator(), envelope = context.createGain(), at = start + offset
          nodes.push(oscillator, envelope)
          oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, at)
          if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, at + duration)
          envelope.gain.setValueAtTime(0, at); envelope.gain.linearRampToValueAtTime(gain, at + .012)
          envelope.gain.exponentialRampToValueAtTime(.001, at + duration)
          oscillator.connect(envelope); envelope.connect(master); oscillator.start(at); oscillator.stop(at + duration + .015)
        })
        timer = setTimeout(stop, delayMs + Math.max(...profile.map(([, offset, duration]) => offset + duration)) * 1000 + 30)
        return true
      } catch { stop(); return false }
    },
  }
}
export const rewardSound = createRewardSound()
