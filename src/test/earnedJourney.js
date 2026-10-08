import {createExperienceState, experienceReducer} from '../data/experienceState'
import {verifiedFixture} from './verificationFixtures'

export function appendVerified(state, {id='visit-1', dishId='lort-cha',restaurantId='preview-thmor-da',day='2026-10-03'}={}) {
  const at=`${day}T12:00:00.000Z`
  const draft={id,dishId,restaurantId,countryCode:'KH',startedAt:at,verification:verifiedFixture({id,dishId,restaurantId,at}),feedback:{reaction:'loved',observations:[],note:''}}
  return experienceReducer(experienceReducer(state,{type:'start',draft}),{type:'complete',id,day,at})
}
/** Signed event fixtures, never fake counters or production demo seeds. */
export function earnedJourney(boxes=1,{opened=true}={}) {
  let state=createExperienceState()
  for(let i=1;i<=boxes*3;i++){
    const id=`earned-${i}`,day=`2026-09-${String(i).padStart(2,'0')}`
    state=appendVerified(state,{id,day})
    if(opened && i%3===0){
      state=experienceReducer(state,{type:'begin-box',id:`box-${id}`})
      state=experienceReducer(state,{type:'open-box',id:`box-${id}`,at:`${day}T12:01:00.000Z`})
    }
  }
  return state
}
