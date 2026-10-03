import { useEffect, useState } from 'react'
import { ShaderFill } from '../../lib/figma-shaders/runtime'
import { setup, render, manifest } from '../../lib/figma-shaders/movingGradient'
import shaderBackground from '../../assets/icons/detail-why-background.png'
import glassOverlay from '../../assets/icons/detail-why-glass.svg'
import aiIcon from '../../assets/icons/detail-ai.svg'

// Figma's shader and runtime are copied verbatim. This role remains local to Details.
const shader = {
  setup, render, manifest,
  params: {
    intensity: 4.289999961853027,
    gradient: { stops: [
      { position: 0, color: { r: 0.8039215803146362, g: 0.95686274766922, b: 0.9490196108818054, a: 1 } },
      { position: 0.5, color: { r: 0.125490203499794, g: 0.7647058963775635, b: 0.7450980544090271, a: 1 } },
      { position: 1, color: { r: 0.8039215803146362, g: 0.95686274766922, b: 0.9490196108818054, a: 1 } },
    ] },
    gradientBalance: 0, material: 0, morphSpeed: 2.190000057220459,
    detail: 1.7799999713897705, twist: 0.03999999910593033, zoom: 72,
    gradientMethod: 0, warp: 0.25999999046325684, rotationSpeed: 59,
  },
}

export default function WhyMatchedCard({ explanation }) {
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setAnimate(Boolean(navigator.gpu) && !reducedMotion.matches)
    update()
    reducedMotion.addEventListener('change', update)
    return () => reducedMotion.removeEventListener('change', update)
  }, [])

  return (
    <section aria-labelledby="why-matched-title" className="relative mt-[14px] min-h-[104px] pt-[8px] pb-[12px]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <img src={shaderBackground} alt="" className="absolute inset-0 size-full object-cover" />
        {animate && <ShaderFill shader={shader} className="absolute inset-0" />}
      </div>
      <img src={glassOverlay} alt="" className="pointer-events-none absolute top-[8px] left-[18px] h-[calc(100%-12px)] w-[405px] max-w-none" />
      <div className="relative mx-[22px] min-h-[84px] w-[397px] pt-[4px] pr-[11px] pb-[9px] pl-[66px] text-surface">
        <img src={aiIcon} alt="" className="absolute top-[7px] left-[11px] max-w-none" />
        <h2 id="why-matched-title" className="text-[17px] leading-[22px] font-bold [text-shadow:0_2px_4px_rgb(0_0_0/0.25)]">
          Why this matched
        </h2>
        <p className="mt-[4px] text-[13px] leading-[15px]">{explanation}</p>
      </div>
    </section>
  )
}
