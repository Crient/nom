/** QA playground only. Normal routes never use this provider. */
export const developmentVerificationProvider = {
  verify({ method = 'location-demo' } = {}) {
    return { verified: method !== 'unverified', method, source: 'qa-preview', checkedAt: new Date().toISOString(),
      sampleDistanceMeters: method === 'location-demo' ? 200 : null, sampleMinutes: method === 'location-demo' ? 17 : null }
  },
}
