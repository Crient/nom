import { cn } from '../../utils/cn'

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
        'h-[128.662px] w-[390.423px] rounded-card bg-field/20 shadow-raised',
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
          className="absolute text-meta tracking-meta whitespace-nowrap text-muted-alt"
          style={{ left: ROW.left, top: ROW.note }}
        >
          {note}
        </p>

        <div
          className="absolute w-[365.577px]"
          style={{ left: ROW.left, top: ROW.bar, height: bar.height }}
        >
          {bar.segments.map((segment, index) => (
            <div
              key={index}
              className={cn('absolute h-[3.549px] rounded-full', TONES[segment.tone])}
              style={{ left: segment.left, top: segment.top, width: segment.width }}
            />
          ))}

          {bar.markers.map((marker, index) => (
            <img
              key={index}
              src={marker.src}
              alt=""
              className="absolute max-w-none"
              style={{
                left: marker.left,
                top: marker.top,
                width: marker.width,
                height: marker.height,
              }}
            />
          ))}

          <div
            className={cn('absolute top-0 overflow-hidden', bar.box.glow && 'shadow-box-ready')}
            style={{ left: bar.box.left, width: bar.box.width, height: bar.box.height }}
          >
            <img
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
          className="absolute h-[14px] w-[364.68px]"
          style={{ left: ROW.left, top: ROW.lifetimeBar }}
        >
          <div
            className="absolute h-[8.873px] rounded-full bg-progress-track"
            style={{ left: lifetime.track.left, top: lifetime.track.top, width: lifetime.track.width }}
          />
          <div
            className="absolute h-[8.873px] rounded-full bg-yellow-accent"
            style={{ left: lifetime.fill.left, top: lifetime.fill.top, width: lifetime.fill.width }}
          />
          <p
            className="absolute top-0 text-meta font-bold tracking-meta whitespace-nowrap text-text-secondary"
            style={{ left: lifetime.rankLeft }}
          >
            {rank}
          </p>
        </div>

        <div
          className="absolute flex h-[14px] w-[363.803px] justify-between pr-[24.703px] text-meta-sm tracking-meta text-muted-alt"
          style={{ left: ROW.left, top: ROW.total }}
        >
          <span>{lifetimeTotal}</span>
          <span>{nextRank}</span>
        </div>
      </div>
    </div>
  )
}
