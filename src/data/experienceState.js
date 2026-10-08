import { BOX_TARGET, collectionCountries, collectibleDefinitions, collectibleKey } from './collectionDefinitions'
import { rewardEligible } from '../../shared/visitVerification'

/** Local calendar day: a dish may earn progress once per day, across restaurants. */
export function visitDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function createExperienceState() {
  const progress = {}, unlocks = {}
  for (const country of collectionCountries) {
    progress[country.id] = { meals: 0, count: 0 }
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
      const eligible = rewardEligible(draft) || Boolean(state.qaOnly && draft.verification.source==='qa-preview' && draft.verification.verified)
      const day = eligible && !state.qaOnly ? draft.verification.checkedAt.slice(0,10) : action.day
      const earnedProgress = Boolean(eligible && !hasCountedDish(state, draft.dishId, day) && country)
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
        progress[country.id] = { meals: previous.meals + (earnedProgress ? 1 : 0), count }
      }
      const log = { ...draft, day, completedAt: eligible && !state.qaOnly ? draft.verification.checkedAt : action.at, countryId: country?.id ?? null, earnedProgress, boxId }
      return { ...state, logs: [...state.logs, log], progress, boxes }
    }
    case 'begin-box': {
      const box = state.boxes[action.id]
      if (!box || box.status !== 'ready') return state
      return { ...state, boxes: { ...state.boxes, [box.id]: { ...box, status: 'opening' } } }
    }
    case 'restore-box': {
      // Event merges can shift a milestone to another visit. Consume an
      // existing earned box credit while preserving the historical opening ID.
      const credit = state.boxes[action.creditId], log = state.logs.find(log => log.id === action.visitId)
      if (!credit || credit.status !== 'ready' || state.boxes[action.id] || !log?.verification?.verified || credit.countryId !== log.countryId) return state
      const boxes = { ...state.boxes }
      delete boxes[credit.id]
      boxes[action.id] = { ...credit, id: action.id, visitId: log.id, createdAt: log.completedAt }
      const logs = state.logs.map(item => ({ ...item, boxId: item.id === log.id ? action.id : item.boxId === credit.id ? null : item.boxId }))
      return { ...state, boxes, logs }
    }
    case 'open-box': {
      const box = state.boxes[action.id]
      if (!box || box.status !== 'opening') return state
      const recorded = collectibleDefinitions.find(item => item.id === action.collectibleId)
      const next = collectibleDefinitions.find(item => !state.unlocks[collectibleKey(box.countryId, item.id)]) ?? collectibleDefinitions[0]
      const reward = recorded && state.unlocks[collectibleKey(box.countryId, recorded.id)] ? recorded : next
      const key = collectibleKey(box.countryId, reward.id), duplicate = Boolean(state.unlocks[key])
      return { ...state,
        boxes: { ...state.boxes, [box.id]: { ...box, status: 'opened', collectibleId: reward.id, duplicate, openedAt: action.at } },
        unlocks: duplicate || state.unlocks[key] ? state.unlocks : { ...state.unlocks, [key]: { discoveredAt: action.at, source: box.id } },
      }
    }
    case 'favorite': {
      if (!state.unlocks[action.key]) return state
      return { ...state, favorites: state.favorites.includes(action.key) ? state.favorites.filter(key => key !== action.key) : [...state.favorites, action.key] }
    }
    default: return state
  }
}
