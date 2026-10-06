/** One outline/filled saved-state treatment for dish and collectible favorites. */
export default function FavoriteStar({ saved = false, size = 24 }) {
  return <svg className="favorite-star" aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 3.5 14.8 8.5 20.4 9.6 16.5 13.8 17.2 19.5 12 17.1 6.8 19.5 7.5 13.8 3.6 9.6 9.2 8.5Z"
      stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill={saved ? 'currentColor' : 'none'} />
  </svg>
}
