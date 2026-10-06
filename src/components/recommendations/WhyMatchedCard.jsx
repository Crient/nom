import { useEffect, useRef, useState } from 'react'
import useReducedMotion from '../../hooks/useReducedMotion'
import aiIcon from '../../assets/icons/detail-ai.svg'

export default function WhyMatchedCard({ explanation }) {
  const card = useRef(null), entered = useRef(false)
  const reduced = useReducedMotion()
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (reduced || entered.current) return
    const enter = () => { entered.current = true; setVisible(true) }
    if (!globalThis.IntersectionObserver) { enter(); return }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { enter(); observer.disconnect() }
    }, { threshold: .25 })
    observer.observe(card.current)
    return () => observer.disconnect()
  }, [reduced])
  return <section ref={card} aria-labelledby="why-matched-title" className="why-matched-card" data-entered={visible}>
    <span className="why-matched-sweep" aria-hidden="true" />
    <div className="why-matched-content">
      <img src={aiIcon} alt="" className="why-matched-icon" />
      <span className="why-matched-sparkles" aria-hidden="true"><i>✦</i><i>✦</i></span>
      <h2 id="why-matched-title" className="text-[17px] leading-[22px] font-bold">Why this matched</h2>
      <p className="why-matched-explanation mt-[4px] min-h-[48px] text-[13px] leading-[16px]">{explanation}</p>
    </div>
  </section>
}
