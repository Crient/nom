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
        className="absolute top-[75.07px] left-[30.01px] h-[22.92px] w-[9.988px] rotate-180"
      >
        <img
          src={chevronLeft}
          alt=""
          className="absolute top-[-1.439px] left-[-1.658px] h-[25.798px] w-[14.558px] max-w-none"
        />
      </button>

      <p className="absolute top-[82px] left-[365px] text-body-tight whitespace-nowrap text-text-primary">
        {step}
      </p>

      <img
        src={markers}
        alt={markersAlt}
        className="absolute top-[124px] left-[32px] h-[32px] w-[375px] max-w-none"
      />
    </>
  )
}
