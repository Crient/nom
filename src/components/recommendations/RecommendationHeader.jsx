import chevronLeft from '../../assets/icons/chevron-left.svg'
import settingsIcon from '../../assets/icons/rec-settings.svg'
import moreBackIcon from '../../assets/icons/rec-more-back.svg'

export default function RecommendationHeader({ onBack, onAdjust, title }) {
  return (
    <>
      <button
        type="button"
        onClick={onBack}
        aria-label="Go back"
        className="absolute top-[75.07px] left-[30.01px] z-10 h-[22.92px] w-[9.988px] rotate-180"
      >
        <img
          src={title ? moreBackIcon : chevronLeft}
          alt=""
          className={title
            ? 'absolute top-[-1.439px] left-[-1.658px] max-w-none'
            : 'absolute top-[-1.439px] left-[-1.658px] h-[25.798px] w-[14.558px] max-w-none'}
        />
      </button>

      {title && (
        <h1 className="absolute inset-x-0 top-[78px] text-center text-title-lg leading-[35px] text-strong-neutral">
          {title}
        </h1>
      )}

      {onAdjust && (
        <button
          type="button"
          onClick={onAdjust}
          className="absolute top-[76px] left-[372px] z-10 flex w-[32px] flex-col items-center"
          aria-label="Adjust preferences"
        >
          <img src={settingsIcon} alt="" className="size-[32px] max-w-none" />
          <span className="mt-[0px] text-[10px] leading-[17.746px] text-alt-teal">Adjust</span>
        </button>
      )}
    </>
  )
}
