import chevronLeft from '../../assets/icons/chevron-left.svg'

/**
 * Back control, step counter and progress bar shared by the discovery
 * question screens. Every frame in 01 - Discovery places these three at the
 * same coordinates, so the positions live here rather than in each screen.
 *
 * The chevron asset points right and is rotated in Figma; the rotation is
 * reproduced rather than swapping in a mirrored asset.
 */
export default function DiscoveryHeader({ step, markers, markersAlt = '', onBack }) {
  return (
    <>
      <button
        type="button"
        onClick={onBack}
        aria-label="Go back"
        className="absolute top-[64.5px] left-[13px] z-20 flex size-[44px] items-center justify-center"
      >
        <img
          src={chevronLeft}
          alt=""
          className="h-[25.798px] w-[14.558px] max-w-none rotate-180"
        />
      </button>

      <p className="absolute top-[82px] right-[33px] text-body-tight whitespace-nowrap text-text-primary">
        {step}
      </p>

      <img
        src={markers}
        alt={markersAlt}
        className="absolute top-[124px] left-[32px] h-[32px] w-[calc(100%-65px)]"
      />
    </>
  )
}
