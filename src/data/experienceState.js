import { BOX_TARGET, collectionCountries, collectibleDefinitions, collectibleKey } from './collectionDefinitions'

/** Local calendar day: a dish may earn progress once per day, across restaurants. */
export function visitDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function createExperienceState() {
  const progress = {}, unlocks = {}
  for (const country of collectionCountries) {
    progress[country.id] = { meals: country.seedMeals, count: country.seedProgress }
    // Cambodia's Figma grid has Ziggy locked; the other five are demo unlocks.
    const seeds = country.id === 'cambodia' ? collectibleDefinitions.slice(1) : collectibleDefinitions.slice(0, country.seedUnlocked)
    for (const reward of seeds) unlocks[collectibleKey(country.id, reward.id)] = { discoveredAt: '2026-09-27T12:00:00.000Z', source: 'demo-seed' }
  }
  return { drafts: {}, logs: [], progress, boxes: {}, unlocks, favorites: [] }
}

export function hasCountedDish(state, dishId, day) {
  return state.logs.some(log => log.dishId === dishId && log.day === day && log.earnedProgress)
}

/** Pure session domain reducer. A future repository can hydrate/save this same shape. */
export function experienceReducer(state, action) {
  switch (action.type) {
    case 'start':
      return { ...state, drafts: { ...state.drafts, [action.draft.id]: action.draft } }
    case 'verify': {
      const draft = state.drafts[action.id]
      if (!draft || state.logs.some(log => log.id === action.id)) return state
      return { ...state, drafts: { ...state.drafts, [action.id]: { ...draft, verification: action.verification } } }
    }
    case 'feedback': {
      const draft = state.drafts[action.id]
      if (!draft || state.logs.some(log => log.id === action.id)) return state
      return { ...state, drafts: { ...state.drafts, [action.id]: { ...draft, feedback: action.feedback } } }
    }
    case 'complete': {
      const draft = state.drafts[action.id]
      if (!draft?.verification || !draft.feedback?.reaction || state.logs.some(log => log.id === action.id)) return state
      const country = collectionCountries.find(country => country.code === draft.countryCode)
      const earnedProgress = Boolean(draft.verification.verified && !hasCountedDish(state, draft.dishId, action.day) && country)
      const progress = { ...state.progress }, boxes = { ...state.boxes }
      let boxId = null
      if (country) {
        const previous = progress[country.id]
        let count = previous.count + (earnedProgress ? 1 : 0)
        if (count >= BOX_TARGET) {
          boxId = `box-${action.id}`
          boxes[boxId] = { id: boxId, countryId: country.id, visitId: action.id, status: 'ready', createdAt: action.at }
          count -= BOX_TARGET
        }
        progress[country.id] = { meals: previous.meals + 1, count }
      }
      const log = { ...draft, day: action.day, completedAt: action.at, countryId: country?.id ?? null, earnedProgress, boxId }
      return { ...state, logs: [...state.logs, log], progress, boxes }
    }
    case 'begin-box': {
      const box = state.boxes[action.id]
      if (!box || box.status !== 'ready') return state
      return { ...state, boxes: { ...state.boxes, [box.id]: { ...box, status: 'opening' } } }
    }
    case 'open-box': {
      const box = state.boxes[action.id]
      if (!box || box.status !== 'opening') return state
      const reward = collectibleDefinitions.find(item => !state.unlocks[collectibleKey(box.countryId, item.id)]) ?? collectibleDefinitions[0]
      const key = collectibleKey(box.countryId, reward.id), duplicate = Boolean(state.unlocks[key])
      return { ...state,
        boxes: { ...state.boxes, [box.id]: { ...box, status: 'opened', collectibleId: reward.id, duplicate, openedAt: action.at } },
        unlocks: duplicate ? state.unlocks : { ...state.unlocks, [key]: { discoveredAt: action.at, source: box.id } },
      }
    }
    case 'favorite': {
      if (!state.unlocks[action.key]) return state
      return { ...state, favorites: state.favorites.includes(action.key) ? state.favorites.filter(key => key !== action.key) : [...state.favorites, action.key] }
    }
    default: return state
  }
}
