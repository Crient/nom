/** Replace with a live verification adapter later. No GPS, camera, or upload access. */
export const developmentVerificationProvider = {
  verify({ method = 'location-demo' } = {}) {
    return { verified: method !== 'unverified', method, source: 'development', checkedAt: new Date().toISOString(),
      sampleDistanceMeters: method === 'location-demo' ? 200 : null, sampleMinutes: method === 'location-demo' ? 17 : null }
  },
}
