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
        className="recommendation-back absolute left-[13px] z-30 flex size-[44px] items-center justify-center"
      >
        <img
          src={title ? moreBackIcon : chevronLeft}
          alt=""
          className={title
            ? 'max-w-none rotate-180'
            : 'h-[25.798px] w-[14.558px] max-w-none rotate-180'}
        />
      </button>

      {title && (
        <h1 className="recommendation-header-title absolute inset-x-0 text-center text-title-lg leading-[35px] text-strong-neutral">
          {title}
        </h1>
      )}

      {onAdjust && (
        <button
          type="button"
          onClick={onAdjust}
          className="recommendation-adjust absolute right-[30px] z-30 flex min-h-[44px] w-[44px] flex-col items-center"
          aria-label="Adjust preferences"
        >
          <img src={settingsIcon} alt="" className="size-[32px] max-w-none" />
          <span className="mt-[0px] text-[10px] leading-[17.746px] text-accessible-teal">Adjust</span>
        </button>
      )}
    </>
  )
}
