const foundations = { cambodia: '#e3f1df', colombia: '#e8f2dc', 'united-states': '#e4edf6',
  japan: '#f8e8ef', italy: '#eef1de', india: '#faecd7', china: '#f6e5df', france: '#eee8f7' }

/** Only dedicated portrait masters can become page art. Missing art stays quiet. */
export function countrySceneProps(country, { portraitBackground } = {}) {
  const portrait = portraitBackground ?? country.background
  return { className: `collection-background ${portrait ? 'collection-portrait' : 'collection-fallback'}`,
    'data-country': country.id,
    style: { '--collection-background': portrait ? `url("${portrait}")` : 'none',
      '--collection-foundation': country.foundation ?? foundations[country.id] ?? '#fff7eb',
      '--collection-art-opacity': country.id === 'cambodia' ? .8 : 1 } }
}
