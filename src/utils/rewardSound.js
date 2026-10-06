const SOUND_KEY = 'nom.reward-sound.v1'
export function rewardSoundEnabled() {
  try { return globalThis.localStorage?.getItem(SOUND_KEY) === 'on' } catch { return false }
}
export function saveRewardSoundPreference(enabled) {
  try { globalThis.localStorage?.setItem(SOUND_KEY, enabled ? 'on' : 'off') } catch { /* Sound stays optional. */ }
}

// Original synthesized one-shots; no sampled or third-party game audio.
// frequency, offset seconds, duration seconds, peak gain, waveform, end frequency
export const REWARD_SOUND_PROFILES = {
  common: [[1174.66, 0, .6, .035, 'triangle']],
  rare: [[1318.51, 0, .55, .035, 'triangle'], [1760, .18, .6, .025, 'triangle']],
  epic: [[196, 0, .45, .05, 'sine', 98], [1568, .12, .7, .025, 'triangle'], [2093, .3, .75, .018, 'triangle']],
  legendary: [[783.99, 0, .5, .018, 'triangle'], [1046.5, .16, .55, .023, 'triangle'],
    [1318.51, .32, .65, .028, 'triangle'], [1568, .48, .9, .033, 'triangle'], [220, .68, .55, .05, 'sine', 110]],
}

/** Call play only from an explicit Open interaction. All boxes share the mute preference. */
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
    play({ enabled = false, reducedMotion = false, delayMs = 950, rarity = 'common' } = {}) {
      if (!enabled || reducedMotion) return false
      try {
        const Audio = getAudioContext()
        if (!Audio) return false
        stop(); context ??= new Audio()
        const playing = generation
        // Resume synchronously inside the user gesture, before route navigation.
        Promise.resolve(context.resume()).catch(() => { if (generation === playing) stop() })
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
