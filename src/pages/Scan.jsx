import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import HubLayout from '../components/layout/HubLayout'
import Button from '../components/ui/Button'
import { dishFromCode } from '../utils/catalogSearch'
import scan from '../assets/icons/quick-scan.svg'

export default function Scan() {
  const [code, setCode] = useState(''), [error, setError] = useState(false), navigate = useNavigate()
  return <HubLayout title="Find a" accent="Dish">
    <section className="hub-section"><img src={scan} alt="" className="scan-symbol" /><h2>Open a Nom dish code</h2><p>Camera scanning is coming soon. For now, paste a Nom dish link or enter a dish code to open it.</p>
      <form onSubmit={event => { event.preventDefault(); const dish = dishFromCode(code, window.location.origin); if (dish) navigate(`/recommendations/${dish.id}`, { state: { returnTo: '/scan' } }); else setError(true) }}>
        <label htmlFor="dish-code">Dish code or Nom link</label><input id="dish-code" value={code} placeholder="e.g. lort-cha" onChange={event => { setCode(event.target.value); setError(false) }} aria-invalid={error} aria-describedby="dish-code-help" />
        <p id="dish-code-help">Use a link from this Nom app or a canonical dish code.</p><Button type="submit" disabled={!code.trim()}>Open dish</Button>{error && <p role="alert">That code doesn’t match a Nom dish. Check it or browse the catalog.</p>}
      </form>
    </section><Link className="hub-action" to="/explore">Browse dishes instead</Link>
  </HubLayout>
}
