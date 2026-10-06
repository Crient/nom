import { useId, useState } from 'react'
import { placeDetailsService } from '../../data/placeExtrasService'
import { usePlaceExtra } from '../../hooks/usePlaceExtra'
import { safeHttpsUri, safePhotoUri } from '../../../shared/placeMedia.js'
import { safeMapsUri } from '../../../shared/nearbyRestaurants.js'
import GooglePlacesAttribution from './GooglePlacesAttribution'
import Button from '../ui/Button'

function ReviewCard({ review }) {
  const [expanded, setExpanded] = useState(false), textId = useId()
  const long = (review.text?.length ?? 0) > 320 || (review.text?.split('\n').length ?? 0) > 4
  return <article className="place-review">
    <div className="place-review-author">
      {safePhotoUri(review.author?.photoUri) && <img className="place-author-avatar" src={review.author.photoUri} alt="" loading="lazy" referrerPolicy="no-referrer" />}
      <div>{safeHttpsUri(review.author?.uri) ? <a href={review.author.uri} target="_blank" rel="noopener noreferrer">{review.author.displayName}</a> : <strong>{review.author?.displayName}</strong>}
        <div className="restaurant-meta">{typeof review.rating === 'number' && <span aria-label={`${review.rating} out of 5 stars`}><span className="restaurant-rating-star" aria-hidden="true">{'★'.repeat(Math.round(review.rating))}{'☆'.repeat(5 - Math.round(review.rating))}</span></span>} {review.relativeTime && <span> · {review.relativeTime}</span>}</div>
      </div>
    </div>
    {review.visitDate && <p className="restaurant-meta">Visited {new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(review.visitDate.year, review.visitDate.month - 1)))}</p>}
    {review.translated && <p className="restaurant-meta">Translated by Google</p>}
    {review.text && <p id={textId} className={`place-review-text ${long && !expanded ? 'place-review-collapsed' : ''}`} lang={review.languageCode ?? undefined}>{review.text}</p>}
    {long && <button type="button" className="place-review-expand" aria-expanded={expanded} aria-controls={textId} onClick={() => setExpanded(value => !value)}>{expanded ? 'Show less' : 'Read more'}</button>}
    {safeMapsUri(review.googleMapsUri) && <a className="place-review-source" href={review.googleMapsUri} target="_blank" rel="noopener noreferrer">Read on Google Maps ↗</a>}
  </article>
}

export default function PlaceReviews({ restaurant }) {
  const result = usePlaceExtra(placeDetailsService, restaurant.placeId)
  return <section className="place-reviews" aria-labelledby="place-reviews-title">
    <h2 id="place-reviews-title">Google reviews</h2>
    {result.status === 'idle' ? <Button variant="secondary" onClick={() => placeDetailsService.load(restaurant.placeId)}>Load Google reviews</Button>
      : result.status === 'loading' ? <p role="status">Loading reviews…</p>
      : result.status === 'error' ? <p role="status">Reviews unavailable right now. You can read reviews on Google Maps.</p>
      : <>
        <p className="restaurant-meta">Up to three reviews in Google’s relevance order. Original text is shown when available.</p>
        {!result.data.reviews.length && <p>No reviews available.</p>}
        {result.data.reviews.slice(0, 3).map((review, index) => <ReviewCard key={index} review={review} />)}
        <GooglePlacesAttribution restaurants={[{ attributions: result.data.attributions }]} />
      </>}
  </section>
}
