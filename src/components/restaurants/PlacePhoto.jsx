import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { placePhotoService } from '../../data/placeExtrasService'
import { usePlaceExtra } from '../../hooks/usePlaceExtra'
import { normalizePhoto } from '../../../shared/placeMedia.js'
import Modal from '../ui/Modal'
import { PHOTO_RESOURCE_ERRORS } from '../../../shared/placeExtrasErrors.js'
import { recordPlaceMediaDiagnostic } from '../../data/nearbyUsage'

export default function PlacePhoto({ restaurant, eager = false, compact = false, hero = false }) {
  const holder = useRef(null), image = useRef(null), [visible, setVisible] = useState(eager), [failedSource, setFailedSource] = useState(null), [readySource, setReadySource] = useState(null), [attempt, setAttempt] = useState(0)
  const photo = normalizePhoto(restaurant.photo, restaurant.placeId, restaurant.photo?.observedAt)
  const data = usePlaceExtra(placePhotoService, photo?.name)
  const [expanded, setExpanded] = useState(false), titleId = useId()
  useEffect(() => setExpanded(false), [restaurant.placeId, photo?.name])
  useEffect(() => {
    if (visible || !photo) return
    if (eager || !globalThis.IntersectionObserver) { setVisible(true); return }
    const observer = new IntersectionObserver(entries => { if (entries.some(row => row.isIntersecting)) { setVisible(true); observer.disconnect() } }, { rootMargin: '150px' })
    observer.observe(holder.current); return () => observer.disconnect()
  }, [visible, photo?.name, eager])
  useEffect(() => { if (visible && photo) placePhotoService.load(photo) }, [visible, photo?.name, photo?.observedAt])
  useEffect(() => { if (!photo) recordPlaceMediaDiagnostic({ kind: 'photo', code: 'MISSING_METADATA', source: 'metadata', calls: 0 }) }, [photo?.name])
  const source = data.status === 'ready' ? data.data.photoUri : null
  const loaded = photo && source && failedSource !== source
  useLayoutEffect(() => {
    if (loaded && image.current?.complete && image.current.naturalWidth > 0) setReadySource(source)
  }, [source, loaded, attempt])
  const mediaState = loaded ? readySource === source ? 'ready' : 'loading' : photo && visible && ['idle', 'loading'].includes(data.status) ? 'loading'
    : PHOTO_RESOURCE_ERRORS.has(data.errorCode) ? 'stale' : (source && failedSource === source) || data.status === 'error' ? 'error' : restaurant.metadataOnly ? 'saved' : 'missing'
  const quota = data.errorCode === 'QUOTA_LIMIT'
  const description = mediaState === 'loading' ? 'Restaurant photo loading' : quota ? 'Restaurant photo temporarily paused by a request limit'
    : mediaState === 'stale' ? 'Restaurant photo resource needs a fresh nearby search' : mediaState === 'error' ? 'Restaurant photo temporarily unavailable' : 'Restaurant photo unavailable'
  const retry = () => {
    setFailedSource(null); setReadySource(null); setAttempt(value => value + 1)
    placePhotoService.load(photo, { retry: true })
  }
  const fallback = <div className={`place-photo-fallback ${loaded ? 'place-photo-loading-image' : ''}`} data-media-state={mediaState} role="img" aria-label={description}>
    <span className="place-photo-monogram" aria-hidden="true">{restaurant.metadataOnly ? '↗' : restaurant.name?.trim()[0]?.toUpperCase() ?? 'N'}</span>
    <span aria-hidden="true">{mediaState === 'loading' ? 'Finding the view…' : mediaState === 'saved' || mediaState === 'stale' ? 'Refresh for photos' : mediaState === 'error' ? quota ? 'Photo paused' : 'View unavailable' : 'A spot to discover'}</span>
  </div>
  return <figure ref={holder} data-media-state={mediaState} className={`place-photo ${compact ? 'place-photo-compact' : ''} ${hero ? 'place-photo-hero' : ''}`}>
    {loaded ? <img ref={image} key={`${source}:${attempt}`} src={source} alt={`${restaurant.name} — Google place photo`} width={800} height={500}
      loading={eager ? 'eager' : 'lazy'} decoding="async" className={`place-photo-image ${readySource === source ? 'is-ready' : ''}`}
      referrerPolicy="no-referrer" onLoad={() => setReadySource(source)} onError={() => {
        setFailedSource(source); recordPlaceMediaDiagnostic({ kind: 'photo', code: 'IMAGE_LOAD_FAILED', source: 'image', calls: 0 })
      }} />
      : fallback}
    {loaded && mediaState === 'loading' && fallback}
    {loaded && hero && <figcaption>
      <span className="place-photo-credit" title={photo.authorAttributions.map(author => author.displayName).join(', ')}>Photo{photo.authorAttributions.length > 0 && ' · '}{photo.authorAttributions.map((author, index) => <span key={index}>
        {index > 0 && ', '}<a href={author.uri} target="_blank" rel="noopener noreferrer">
          {author.displayName}
        </a>
      </span>)}</span>
      <a className="place-photo-source" href={photo.googleMapsUri} target="_blank" rel="noopener noreferrer" aria-label="View photo source on Google Maps" title="View original photo">↗</a>
    </figcaption>}
    {loaded && !hero && <button type="button" className="place-photo-expand" aria-label={`View larger photo and credits for ${restaurant.name}`}
      title="View photo and credits" onClick={event => { event.stopPropagation(); setExpanded(true) }}><span aria-hidden="true">⤢</span></button>}
    {mediaState === 'error' && photo && <button className="place-photo-retry" type="button" aria-label={`Retry photo for ${restaurant.name}`}
      title={quota ? 'Photo request limit reached. Retry deliberately later.' : 'Retry photo'} onClick={event => { event.stopPropagation(); retry() }}><span aria-hidden="true">↻</span></button>}
    {loaded && !hero && expanded && createPortal(<div onClick={event => event.stopPropagation()}><Modal open onClose={() => setExpanded(false)} labelledBy={titleId} className="place-photo-viewer">
      <header><h2 id={titleId}>{restaurant.name}</h2><button type="button" aria-label="Close photo" onClick={() => setExpanded(false)}>×</button></header>
      <img src={source} alt={`${restaurant.name} — Google place photo`} />
      <p className="place-photo-viewer-credits">{photo.authorAttributions.map((author, index) => <span key={index}>{index > 0 && ' · '}<a href={author.uri} target="_blank" rel="noopener noreferrer">
        {author.photoUri && <img className="place-photo-author-avatar" src={author.photoUri} alt="" width={24} height={24} loading="lazy" referrerPolicy="no-referrer" onError={event => { event.currentTarget.hidden = true }} />}{author.displayName}</a></span>)}</p>
      <a className="place-photo-source" href={photo.googleMapsUri} target="_blank" rel="noopener noreferrer">View original photo on Google Maps</a>
    </Modal></div>, document.body)}
  </figure>
}
