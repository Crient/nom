import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ExperienceNavigate as Navigate, useExperienceRoute } from '../context/ExperienceFlow'
import { useVisit } from '../hooks/useVisit'
import { useExperience } from '../context/Experience'
import { useAuth } from '../context/Auth'
import { hasCountedDish, visitDay } from '../data/experienceState'
import { collectFreshLocation, createVisitVerificationApi, receiptUpload } from '../data/liveVisitVerification'
import { manualVerification, rewardEligible } from '../../shared/visitVerification'
import { FlowCTA, FlowHeader, FlowState, FlowTitle } from '../components/experience/FlowLayout'
import EdgeStateModal from '../components/experience/EdgeStateModal'
import RestaurantQrScanner from '../components/experience/RestaurantQrScanner'
import VisitVerificationMap from '../components/experience/VisitVerificationMap'
import GooglePlacesAttribution from '../components/restaurants/GooglePlacesAttribution'
import shield from '../assets/experience/shield.svg'
import check from '../assets/experience/check.svg'
import clock from '../assets/experience/clock.svg'
import errorIcon from '../assets/experience/verification-error.svg'

const failures = {
  too_far: 'You appear to be too far from the restaurant.', poor_accuracy: 'Your location accuracy is too low.',
  permission_denied: 'Location permission denied.', location_denied: 'Location permission denied.',
  location_unavailable: 'Your location is unavailable.', timeout: 'The location check timed out.',
  location_not_configured: 'Location verification is currently unavailable.', server_error: 'The visit check couldn’t complete. Try again.',
  interrupted: 'Location check paused.', rate_limited: 'Please wait before trying again.',
  sign_in_required: 'Your session changed. Please sign in again.',
  invalid_code: 'This isn’t a valid Nom restaurant QR.', expired_code: 'This restaurant QR has expired.',
  wrong_restaurant: 'This evidence is for a different restaurant.', already_used: 'This QR or receipt has already been used.',
  could_not_verify: 'We couldn’t verify this receipt.', old_receipt: 'The receipt is too old or its date could not be confirmed.',
  upload_error: 'Choose a JPEG, PNG or WebP under 2 MB.', provider_error: 'Receipt processing is unavailable. Please retry.',
  method_unavailable: 'This restaurant doesn’t currently support Nom QR verification.',
  provider_not_configured: 'Receipt verification cannot currently complete here. Try another option or log without verification.',
}
const pendingStates = ['preparing', 'requesting', 'permission_prompt', 'checking']

export default function VerifyVisit() {
  const route = useExperienceRoute(), { params: { visitId }, navigate, initialModal, testMode } = route
  const { visit, log, dish, restaurant, status, retry } = useVisit(visitId)
  const { state, verifyVisit } = useExperience(), auth = useAuth()
  const [modal, setModal] = useState(initialModal ?? null), [capabilities, setCapabilities] = useState({})
  const [result, setResult] = useState('preparing'), [automatic, setAutomatic] = useState('preparing')
  const [mode, setMode] = useState('location'), [busy, setBusy] = useState(true), [userPosition, setUserPosition] = useState(null)
  const flight = useRef(null), bootstrap = useRef(null), generation = useRef(0)
  const api = useMemo(() => createVisitVerificationApi({ getToken: async () => {
    if (!auth.isAuthenticated) return null
    const r = await auth.client.auth.getSession()
    if (r.error || r.data.session?.user.id !== auth.user.id) throw Object.assign(new Error('Session changed'), { code: 'sign_in_required' })
    return r.data.session.access_token
  } }), [auth.client, auth.isAuthenticated, auth.user?.id])
  const apply = useCallback(response => {
    if (response.result === 'cancelled') return 'interrupted'
    if (response.result === 'verified') {
      if (!rewardEligible({ id: visitId, dishId: visit?.dishId, restaurantId: visit?.restaurantId, countryCode: visit?.countryCode, verification: response.verification })) {
        setResult('server_error'); return 'server_error'
      }
      verifyVisit(visitId, response.verification)
    }
    const next = response.result ?? 'server_error'
    setResult(next); return next
  }, [verifyVisit, visitId, visit?.dishId, visit?.restaurantId, visit?.countryCode])
  const cancel = useCallback(() => {
    bootstrap.current?.abort(); flight.current?.abort(); flight.current = null; generation.current++
  }, [])
  const location = useCallback(async available => {
    if (!visit || flight.current) return
    const controller = new AbortController(), run = ++generation.current
    flight.current = controller
    setMode('location'); setBusy(true); setResult('requesting'); setAutomatic('requesting'); setUserPosition(null)
    const current = () => run === generation.current && !controller.signal.aborted
    try {
      // The existing QA sandbox remains in memory and never asks for real GPS.
      if (testMode && route.qaVerify) {
        verifyVisit(visitId, route.qaVerify()); setResult('verified'); setAutomatic('verified'); return
      }
      if (!available) { setResult('location_not_configured'); setAutomatic('location_not_configured'); return }
      const samples = await collectFreshLocation({ signal: controller.signal, onPermission: permission => {
        if (!current()) return
        const next = permission === 'prompt' ? 'permission_prompt' : 'requesting'
        setResult(next); setAutomatic(next)
      } })
      if (!current()) return
      if (samples.result !== 'samples') { setAutomatic(apply(samples)); return }
      const latest = samples.samples.at(-1)
      setUserPosition({ latitude: latest.latitude, longitude: latest.longitude })
      setResult('checking'); setAutomatic('checking')
      const response = await api.verify(visit, 'location', { samples: samples.samples }, controller.signal)
      if (current()) setAutomatic(apply(response))
    } catch {
      if (current()) { setResult('server_error'); setAutomatic('server_error') }
    } finally {
      if (current()) { flight.current = null; setBusy(false) }
    }
  }, [api, visit?.id, visit?.dishId, visit?.restaurantId, visit?.countryCode, apply, testMode, route.qaVerify, verifyVisit, visitId])
  useEffect(() => {
    if (!visit || log || !restaurant) return
    const controller = new AbortController(); bootstrap.current = controller
    setMode('location'); setBusy(true); setResult('preparing'); setAutomatic('preparing'); setUserPosition(null)
    if (testMode) {
      if (initialModal === 'failed') { setResult('too_far'); setAutomatic('too_far'); setBusy(false) }
      else location(true)
    } else {
      api.capabilities(controller.signal).catch(() => ({})).then(c => {
        if (controller.signal.aborted) return
        setCapabilities(c); location(Boolean(c.location))
      })
    }
    return cancel
  }, [visit?.id, log?.id, restaurant?.id, api, testMode, initialModal, location, cancel])
  const qrToken = useCallback(async token => {
    if (flight.current) return
    const controller = new AbortController(), run = ++generation.current
    flight.current = controller; setMode('qr'); setBusy(true); setResult('checking')
    try {
      const response = await api.verify(visit, 'qr', { qrToken: token }, controller.signal)
      if (run === generation.current && !controller.signal.aborted) apply(response)
    } catch { if (run === generation.current && !controller.signal.aborted) setResult('server_error') }
    finally { if (run === generation.current && !controller.signal.aborted) { flight.current = null; setBusy(false) } }
  }, [api, visit?.id, apply])
  async function receipt(file) {
    if (!file || !capabilities.receipt || flight.current) return
    const controller = new AbortController(), run = ++generation.current
    flight.current = controller; setMode('receipt'); setBusy(true); setResult('uploading')
    try {
      const upload = await receiptUpload(file)
      if (run !== generation.current || controller.signal.aborted) return
      setResult('processing')
      const response = await api.verify(visit, 'receipt', { receipt: upload }, controller.signal)
      if (run === generation.current && !controller.signal.aborted) apply(response)
    } catch { if (run === generation.current && !controller.signal.aborted) setResult('upload_error') }
    finally { if (run === generation.current && !controller.signal.aborted) { flight.current = null; setBusy(false) } }
  }
  const home = () => navigate('/home')
  if (!visit || !dish) return <FlowState title="Visit not found" onBack={home}>Start again from a restaurant. Completed meals remain in History.</FlowState>
  if (log) return <Navigate to={`/visits/${visitId}/logged`} replace />
  const restaurantRoute = `/recommendations/${dish.id}/nearby/${visit.restaurantId}${visit.returnState?.surprise ? '?surprise=1' : ''}`
  const back = () => navigate(restaurantRoute, { state: visit.returnState })
  if (status === 'loading') return <FlowState title="Loading visit…" onBack={back}>Getting your restaurant.</FlowState>
  if (!restaurant) return <FlowState title="Restaurant unavailable" onBack={home} onRetry={status === 'error' ? retry : undefined}>Choose a restaurant to start again.</FlowState>
  const verified = (testMode ? visit.verification?.verified : rewardEligible(visit)) && result === 'verified' && !busy
  const locationVerified = verified && mode === 'location' && automatic === 'verified'
  const locationPending = mode === 'location' && pendingStates.includes(automatic)
  const locationUnavailable = automatic === 'location_not_configured'
  const proceed = () => {
    if (!verified) return
    const day = testMode ? visitDay() : visit.verification?.checkedAt?.slice(0, 10) ?? visitDay()
    if (hasCountedDish(state, dish.id, day)) setModal('counted')
    else navigate(`/visits/${visitId}/feedback`)
  }
  const manual = () => { cancel(); verifyVisit(visitId, manualVerification()); navigate(`/visits/${visitId}/feedback`) }
  function openFallback() {
    cancel(); setBusy(false); setMode('location')
    if (locationPending) { setAutomatic('interrupted'); setResult('interrupted') }
    else setResult(automatic)
    setModal('failed')
  }
  function chooseMethod(method) {
    cancel(); setBusy(false)
    if (method === 'manual') { setModal('manual'); return }
    setModal(null); setMode(method === 'qr' && capabilities.qr ? 'qr-camera' : method)
    setResult(capabilities[method] ? 'idle' : method === 'qr' ? 'method_unavailable' : 'provider_not_configured')
  }
  const distance = locationVerified && Number.isFinite(visit.verification.distanceMeters) ? visit.verification.distanceMeters : null
  const fallbackStatus = verified ? (visit.verification.method === 'qr' ? 'Restaurant QR verified' : 'Receipt verified')
    : result === 'uploading' ? 'Uploading receipt…' : result === 'processing' ? 'Processing your receipt…'
      : busy ? 'Checking your evidence…' : failures[result]
  const rows = [
    { title: 'Location', success: locationVerified, pending: locationPending,
      copy: locationVerified ? `You are near ${restaurant.name}.` : automatic === 'permission_prompt' ? 'Waiting for location permission…' : locationPending ? 'Checking your location…' : locationUnavailable ? 'Location was not checked.' : 'We couldn’t confirm your location.' },
    { title: locationVerified ? 'Distance confirmed' : 'Distance / Accuracy', success: locationVerified, pending: locationPending,
      copy: locationVerified ? `You’re within the verification range.${distance !== null ? ` About ${distance} m away.` : ''}` : locationPending ? 'Checking your distance…' : failures[automatic] ?? 'Distance hasn’t been confirmed.' },
    { title: verified ? 'All set!' : 'Verification', success: Boolean(verified), pending: busy,
      copy: verified ? (mode === 'location' ? 'Your visit has been verified.' : fallbackStatus) : busy ? 'Verifying your visit…' : locationUnavailable ? 'Use another option to log your visit.' : 'We couldn’t verify this visit automatically.' },
  ]
  return <div className="flow-page verify-page">
    <FlowHeader onBack={back} onInfo={() => setModal('progress')} /><FlowTitle title="Verify Your Visit" subtitle={restaurant.name} />
    {testMode && <p className="flow-demo verify-demo" role="status">QA preview only. No real visit is verified or saved.</p>}
    <VisitVerificationMap restaurant={restaurant} userPosition={userPosition} testMode={testMode}
      attribution={restaurant.source === 'google-places' && !restaurant.metadataOnly ? <GooglePlacesAttribution restaurants={[restaurant]} /> : null} />
    <section className="verify-checks visit-verification-result" aria-live="polite" aria-busy={busy} data-result={result}>
      {rows.map(row => <div key={row.title} className={`verify-check ${row.success ? 'verify-check-green' : row.pending ? 'verify-check-pending' : 'verify-check-error'}`}>
        <span aria-hidden="true"><img src={row.success ? check : row.pending ? clock : errorIcon} alt="" /></span><div><h2>{row.title}</h2><p>{row.copy}</p></div>
      </div>)}
    </section>
    <div className="flow-privacy"><img src={shield} alt="" /><p>We only use your location to verify this visit. Your exact location isn’t saved.</p></div>
    {!verified && result !== 'preparing' && <button type="button" className="verify-alternative" onClick={openFallback}>Couldn’t verify automatically?</button>}
    {!busy && !verified && <button type="button" className="verify-alternative visit-location-retry" onClick={() => location(capabilities.location)}>Try location again</button>}
    {mode !== 'location' && <section className="visit-fallback-flow" aria-live="polite">
      <h2>{mode.startsWith('qr') ? 'Restaurant QR' : 'Scan receipt'}</h2>
      {fallbackStatus && <p role="status">{fallbackStatus}</p>}
      {mode === 'receipt' && capabilities.receipt && <div className="visit-receipt">
        <label htmlFor="visit-receipt-upload">Take or import a photo of your receipt</label>
        <input id="visit-receipt-upload" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={busy} onChange={e => { receipt(e.target.files?.[0]); e.target.value = '' }} />
        <p>JPEG, PNG or WebP, up to 2 MB. Show the restaurant and address on a recent receipt.</p>
      </div>}
      {mode === 'qr-camera' && capabilities.qr && <RestaurantQrScanner onToken={qrToken} onClose={() => { setMode('location'); setResult(automatic) }} />}
      {!busy && <button type="button" className="verify-alternative" onClick={openFallback}>Choose another option</button>}
    </section>}
    <FlowCTA disabled={!verified} onClick={proceed}>Continue</FlowCTA>
    <EdgeStateModal kind={modal} onClose={() => setModal(null)} onVerify={chooseMethod} onManualConfirm={manual}
      onLogAnyway={() => navigate(`/visits/${visitId}/feedback`)} onOtherDishes={() => navigate(`${restaurantRoute}#popular-menu`, { state: visit.returnState })} />
  </div>
}
