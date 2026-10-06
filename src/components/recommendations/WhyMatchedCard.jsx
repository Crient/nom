import shaderBackground from '../../assets/icons/detail-why-background.png'
import glassOverlay from '../../assets/icons/detail-why-glass.svg'
import aiIcon from '../../assets/icons/detail-ai.svg'

/** The exported Figma band and glass overlay need no GPU or animation runtime. */
export default function WhyMatchedCard({ explanation }) {
  return (
    <section aria-labelledby="why-matched-title" className="why-matched-card relative mt-[14px] min-h-[104px] pt-[8px] pb-[12px]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <img src={shaderBackground} alt="" width={440} height={104} className="absolute inset-0 size-full object-cover" />
      </div>
      <img src={glassOverlay} alt="" className="pointer-events-none absolute top-[8px] left-[18px] h-[calc(100%-12px)] w-[calc(100%-35px)]" />
      <span className="why-matched-sweep" aria-hidden="true" />
      <div className="relative mx-[22px] min-h-[84px] pt-[4px] pr-[11px] pb-[9px] pl-[66px] text-strong-neutral">
        <img src={aiIcon} alt="" className="absolute top-[7px] left-[11px] max-w-none" />
        <span className="why-matched-sparkles" aria-hidden="true"><i>✦</i><i>✦</i></span>
        <h2 id="why-matched-title" className="text-[17px] leading-[22px] font-bold">Why this matched</h2>
        <p className="why-matched-explanation mt-[4px] min-h-[48px] text-[13px] leading-[16px]">{explanation}</p>
      </div>
    </section>
  )
}
