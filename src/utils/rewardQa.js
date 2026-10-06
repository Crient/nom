// The flag is a build setting, never a query or storage switch.
export function rewardQaEnabled() {
  return import.meta.env.VITE_ENABLE_REWARD_QA === 'true'
}
