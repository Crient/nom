// Presentation clocks and energy only. Reward selection and grants remain in
// experienceState and never depend on these values.
export const BOX_REVEAL_TIMING = { energy: 300, pop: 550, silhouette: 600, reward: 950, rarity: 1050, progress: 1250, settle: 1550 }
export const BOX_REDUCED_TIMING = { energy: 20, pop: 40, silhouette: 70, reward: 100, rarity: 130, progress: 170, settle: 220 }
export const REWARD_PRESENTATION = {
  common: { duration: 1550, particles: 6, rings: 1, spread: 106, lift: 48, shake: 3, climax: 1.08, glow: .65 },
  rare: { duration: 1850, particles: 10, rings: 2, spread: 118, lift: 66, shake: 4, climax: 1.12, glow: .75 },
  epic: { duration: 2150, particles: 14, rings: 3, spread: 130, lift: 86, shake: 5, climax: 1.16, glow: .85 },
  legendary: { duration: 2550, particles: 18, rings: 4, spread: 142, lift: 110, shake: 6, climax: 1.2, glow: .95 },
}
export function rewardPresentation(rarity) { return REWARD_PRESENTATION[rarity] ?? REWARD_PRESENTATION.common }
export function rewardRevealTiming(rarity, reduced = false) {
  if (reduced) return BOX_REDUCED_TIMING
  const scale = rewardPresentation(rarity).duration / BOX_REVEAL_TIMING.settle
  return Object.fromEntries(Object.entries(BOX_REVEAL_TIMING).map(([stage, ms]) => [stage, Math.round(ms * scale)]))
}
