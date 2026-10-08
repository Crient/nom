import {describe,it,expect} from 'vitest'
import {createExperienceState} from './experienceState'
import {normalizeExperience,serializeExperience} from './persistedState'
import {appendVerified,earnedJourney} from '../test/earnedJourney'

describe('trusted verification persistence',()=>{
  it('starts every country and identity without demo rewards',()=>{
    const state=createExperienceState()
    expect(state.logs).toEqual([]);expect(state.boxes).toEqual({});expect(state.unlocks).toEqual({});expect(state.favorites).toEqual([])
    expect(Object.values(state.progress).every(p=>p.meals===0&&p.count===0)).toBe(true)
  })
  it('preserves signed local evidence and metadata through repeated refreshes',()=>{
    const original=appendVerified(createExperienceState())
    let restored=original
    for(let i=0;i<5;i++)restored=normalizeExperience(serializeExperience(restored))
    expect(restored.progress).toEqual(original.progress)
    expect(restored.logs[0].verification).toEqual(original.logs[0].verification)
    expect(restored.logs[0].earnedProgress).toBe(true)
  })
  it('retains legacy history and feedback while removing simulated credit',()=>{
    const payload=serializeExperience(appendVerified(createExperienceState()))
    payload.logs[0].verification={verified:true,method:'location-demo',source:'development',checkedAt:payload.logs[0].completedAt}
    const restored=normalizeExperience({...payload,progress:{cambodia:{meals:17,count:2}},unlocks:{'cambodia:lumi':{source:'seed'}}})
    expect(restored.logs).toHaveLength(1);expect(restored.logs[0].feedback.reaction).toBe('loved')
    expect(restored.logs[0].verification).toMatchObject({verified:false,status:'unverified',method:'none'})
    expect(restored.progress.cambodia).toEqual({meals:0,count:0});expect(restored.unlocks).toEqual({})
  })
  it('rejects tampered proof metadata and duplicate proof/visit substitutions',()=>{
    const payload=serializeExperience(appendVerified(createExperienceState()))
    payload.logs.push({...payload.logs[0],id:'substituted'})
    payload.logs[0].verification.distanceMeters=0
    const restored=normalizeExperience(payload)
    expect(restored.progress.cambodia.meals).toBe(0)
    expect(restored.logs.every(l=>!l.earnedProgress)).toBe(true)
  })
  it('does not import isolated QA flags, events, or rewards',()=>{
    const payload=serializeExperience(earnedJourney(1))
    payload.logs=payload.logs.map(l=>({...l,id:'qa-'+l.id,verification:{...l.verification,source:'qa-preview'}}))
    const restored=normalizeExperience({...payload,qaOnly:true})
    expect(restored.logs).toEqual([]);expect(restored.boxes).toEqual({});expect(restored).not.toHaveProperty('qaOnly')
  })
  it('cannot unlock a locked legendary collectible by modifying an opening record',()=>{
    const payload=serializeExperience(earnedJourney(1))
    payload.openedBoxes[0].collectibleId='lumi';payload.openedBoxes[0].duplicate=false
    const restored=normalizeExperience(payload)
    expect(restored.unlocks['cambodia:lumi']).toBeUndefined()
    expect(restored.boxes['box-earned-3'].collectibleId).toBe('ziggy')
  })
})
