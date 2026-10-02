import checkIcon from '../../assets/icons/check.svg'
import surpriseImage from '../../assets/food/region-surprise.png'

/**
 * Full-width Surprise Me row unique to the Region frame. Yellow fill/border
 * is its resting appearance; selection adds the same check badge used on
 * the region tiles rather than switching it to the teal selected fill.
 */
export default function SurpriseRegionCard({ selected = false, onSelect }) {
  return (
    <div className="absolute top-[889px] left-[9px] flex h-[120px] w-[425px] flex-col items-center justify-center overflow-hidden bg-surface pb-[22.111px]">
      <div className="flex h-[109px] w-[393px] items-center justify-center px-[21.535px] drop-shadow-tile">
        <button
          type="button"
          aria-pressed={selected}
          onClick={onSelect}
          className="relative flex h-[92px] w-[391px] shrink-0 items-center justify-center overflow-hidden rounded-md border-[0.86px] border-solid border-yellow-accent bg-surprise-fill"
        >
          <span className="relative h-[80px] w-[252px] shrink-0 overflow-hidden">
            <img
              src={surpriseImage}
              alt=""
              className="absolute top-[-18.76%] left-[-2.91%] h-[128.18%] w-[106.39%] max-w-none"
            />
          </span>

          <span className="flex h-[51.512px] w-[117px] shrink-0 flex-col items-center justify-between p-[7.339px] text-text-primary">
            <span className="text-[18px] leading-[14.677px] font-semibold whitespace-nowrap [text-shadow:0_1.387px_1.387px_rgb(0_0_0/0.25)]">
              Surprise Me
            </span>
            <span className="text-[10px] leading-[20px] whitespace-nowrap">Pick a region for me</span>
          </span>

          {selected && (
            <span className="absolute top-[5.23px] right-[7.323px] size-[23.077px] rounded-full bg-alt-teal">
              <img
                src={checkIcon}
                alt=""
                className="absolute top-[4.44px] left-[4.44px] size-[13.314px] max-w-none"
              />
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
