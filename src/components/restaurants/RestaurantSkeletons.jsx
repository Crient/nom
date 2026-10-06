/** Geometry mirrors final venue cards so text/photo requests never leave a dead section. */
export default function RestaurantSkeletons({ compact = false, count = 3 }) {
  return <div className={compact ? 'restaurant-preview-grid restaurant-skeleton-grid' : 'nearby-results restaurant-skeleton-list'} role="status" aria-label="Finding restaurants near you">
    <span className="sr-only">Finding restaurants near you…</span>
    {Array.from({ length: count }, (_, index) => <div key={index} aria-hidden="true" className={compact ? 'restaurant-preview-live restaurant-skeleton' : 'restaurant-card restaurant-card-live restaurant-skeleton'}>
      <div className={`place-photo ${compact ? 'place-photo-compact' : ''}`}><div className="place-photo-fallback skeleton-block" /></div>
      <div className={compact ? 'restaurant-preview-copy' : 'restaurant-copy'}>
        <span className="skeleton-block skeleton-title" /><span className="skeleton-block skeleton-line" />
        <span className="skeleton-block skeleton-line skeleton-short" /><span className="skeleton-block skeleton-line" />
      </div>
    </div>)}
  </div>
}
