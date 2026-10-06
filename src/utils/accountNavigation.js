export function safeAccountReturn(value, fallback = '/home') {
  if (typeof value !== 'string' || !value.startsWith('/') || /[\\\u0000-\u0020]/.test(value) || value.startsWith('//')) return fallback
  try {
    const url = new URL(value, 'https://nom.invalid')
    if (url.origin !== 'https://nom.invalid' || !/^\/(home|profile|favorites|history|progress|collections|explore|scan|discover|recommendations|visits|boxes)(\/|$)/.test(url.pathname)) return fallback
    return `${url.pathname}${url.search}${url.hash}`
  } catch { return fallback }
}

export function rememberAccountReturn(path) {
  try { sessionStorage.setItem('nom.auth.returnTo', safeAccountReturn(path)) } catch { /* Safe fallback. */ }
}

export function consumeAccountReturn() {
  try {
    const path = sessionStorage.getItem('nom.auth.returnTo')
    sessionStorage.removeItem('nom.auth.returnTo')
    return safeAccountReturn(path)
  } catch { return '/home' }
}
