import { useEffect, useState } from 'react'

export default function useReducedMotion() {
  const [reduced, setReduced] = useState(() => !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const media = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(!!media?.matches)
    update(); media?.addEventListener?.('change', update)
    return () => media?.removeEventListener?.('change', update)
  }, [])
  return reduced
}
