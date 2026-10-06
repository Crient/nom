/** Compact text attribution follows Google's mobile text-attribution guidance. */
export default function GooglePlacesAttribution({ restaurants = [] }) {
  const providers = [...new Map(restaurants.flatMap(place => place.attributions ?? [])
    .map(item => [`${item.provider}:${item.providerUri}`, item])).values()]
  return <div className="places-attribution">
    <span translate="no" className="google-maps-attribution">Google Maps</span>
    {providers.map(item => item.providerUri ? <a key={`${item.provider}:${item.providerUri}`} href={item.providerUri} target="_blank" rel="noopener noreferrer">{item.provider}</a>
      : <span key={item.provider}>{item.provider}</span>)}
  </div>
}
