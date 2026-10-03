import { cn } from '../../utils/cn'
import Image from './Image'

const TONES = {
  base: 'bg-progress-base',
  fill: 'bg-teal-tint',
  track: 'bg-progress-track',
}

/* Offsets of the card's stacked rows, measured from the card's top-left. */
const ROW = {
  left: 12.423,
  name: 10.98,
  note: 33.98,
  bar: 47.98,
  lifetimeLabel: 71.05,
  lifetimeBar: 89.69,
  total: 103.69,
}

/** Design system 05 - Cards / Progress Cards. */
export default function CountryProgressCard({
  name,
  note,
  rank,
  lifetimeTotal,
  nextRank,
  bar,
  lifetime,
  className,
  style,
}) {
  return (
    <div
      className={cn(
        'h-[128.662px] w-full rounded-card bg-field/20 shadow-raised',
        className,
      )}
      style={style}
    >
      <div className="relative h-full">
        <p
          className="absolute text-card-title tracking-meta whitespace-nowrap text-strong-neutral"
          style={{ left: ROW.left, top: ROW.name }}
        >
          {name}
        </p>
        <p
          className="absolute text-meta tracking-meta whitespace-nowrap text-text-secondary"
          style={{ left: ROW.left, top: ROW.note }}
        >
          {note}
        </p>

        <div
          className="absolute w-[calc(100%-24.846px)]"
          style={{ left: ROW.left, top: ROW.bar, height: bar.height }}
        >
          {bar.segments.map((segment, index) => (
            <div
              key={index}
              className={cn('absolute h-[3.549px] rounded-full', TONES[segment.tone])}
              style={{ left: `${segment.left / 365.577 * 100}%`, top: segment.top, width: `${segment.width / 365.577 * 100}%` }}
            />
          ))}

          {bar.markers.map((marker, index) => (
            <img
              key={index}
              src={marker.src}
              alt=""
              className="absolute max-w-none"
              style={{
                left: `${marker.left / 365.577 * 100}%`,
                top: marker.top,
                width: marker.width > 30 ? `${marker.width / 365.577 * 100}%` : marker.width,
                height: marker.height,
              }}
            />
          ))}

          <div
            className={cn('absolute top-0 overflow-hidden', bar.box.glow && 'shadow-box-ready')}
            style={{ right: 0, width: bar.box.width, height: bar.box.height }}
          >
            <Image loading="lazy"
              src={bar.box.src}
              alt=""
              className={cn(
                'max-w-none',
                bar.box.crop
                  ? 'absolute top-[-26.92%] left-0 h-[153.85%] w-[133.33%]'
                  : 'size-full object-cover',
              )}
            />
          </div>
        </div>

        <p
          className="absolute w-[49.69px] text-meta font-bold tracking-meta text-strong-neutral"
          style={{ left: ROW.left, top: ROW.lifetimeLabel }}
        >
          LIFETIME
        </p>

        <div
          className="absolute h-[14px] w-[calc(100%-25.733px)]"
          style={{ left: ROW.left, top: ROW.lifetimeBar }}
        >
          <div
            className="absolute h-[8.873px] rounded-full bg-progress-track"
            style={{ left: `${lifetime.track.left / 364.68 * 100}%`, top: lifetime.track.top, width: `${lifetime.track.width / 364.68 * 100}%` }}
          />
          <div
            className="absolute h-[8.873px] rounded-full bg-yellow-accent"
            style={{ left: `${lifetime.fill.left / 364.68 * 100}%`, top: lifetime.fill.top, width: `${lifetime.fill.width / 364.68 * 100}%` }}
          />
          <p
            className="absolute top-0 text-meta font-bold tracking-meta whitespace-nowrap text-text-secondary"
            style={{ right: 0 }}
          >
            {rank}
          </p>
        </div>

        <div
          className="absolute flex h-[14px] w-[calc(100%-24.846px)] justify-between gap-[4px] text-meta-sm tracking-meta text-text-secondary"
          style={{ left: ROW.left, top: ROW.total }}
        >
          <span>{lifetimeTotal}</span>
          <span>{nextRank}</span>
        </div>
      </div>
    </div>
  )
}
