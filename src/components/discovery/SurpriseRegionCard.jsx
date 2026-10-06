import Image from '../ui/Image'
import checkIcon from '../../assets/icons/check.svg'
import surpriseImage from '../../assets/food/region-surprise.webp'

/**
 * Full-width Surprise Me row unique to the Region frame. Yellow fill/border
 * is its resting appearance; selection adds the same check badge used on
 * the region tiles rather than switching it to the teal selected fill.
 */
export default function SurpriseRegionCard({ selected = false, onSelect }) {
  return (
    <div className="discovery-surprise-region flex min-h-[120px] flex-col items-center justify-center bg-surface pb-[22.111px]">
      <div className="flex min-h-[109px] w-[calc(100%-34px)] items-center justify-center drop-shadow-tile">
        <button
          type="button"
          aria-pressed={selected}
          onClick={onSelect}
          className="surprise-region-button relative flex min-h-[92px] w-full items-center justify-center overflow-hidden pr-[38px] rounded-md border-[0.86px] border-solid border-yellow-accent bg-surprise-fill"
        >
          <span className="relative h-[80px] min-w-0 flex-1 overflow-hidden">
            <Image
              src={surpriseImage}
              alt=""
              className="absolute top-[-18.76%] left-[-2.91%] h-[128.18%] w-[106.39%] max-w-none"
            />
          </span>

          <span className="surprise-region-copy flex min-h-[51.512px] shrink-0 flex-col items-center gap-[4px] p-[7.339px] text-text-primary">
            <span className="text-[18px] leading-[22px] font-semibold whitespace-nowrap [text-shadow:0_1.387px_1.387px_rgb(0_0_0/0.25)]">
              Surprise Me
            </span>
            <span className="text-[12px] leading-[20px] whitespace-nowrap">Pick a region for me</span>
          </span>

          <span className="surprise-region-indicator-slot" aria-hidden="true">{selected && (
            <span className="absolute top-[5.23px] right-[7.323px] size-[23.077px] rounded-full bg-alt-teal">
              <img
                src={checkIcon}
                alt=""
                className="absolute top-[4.44px] left-[4.44px] size-[13.314px] max-w-none"
              />
            </span>
          )}</span>
        </button>
      </div>
    </div>
  )
}
