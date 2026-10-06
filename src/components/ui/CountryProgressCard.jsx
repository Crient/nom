import { cn } from '../../utils/cn'
import Image from './Image'
import '../../styles/progress.css'

/** The same presentation model and reward values on Home, Progress and Collections. */
export default function CountryProgressCard({ name, note, rank, lifetimeTotal, nextRank, bar, lifetime, className, style }) {
  const track = bar.segments.find(segment => segment.tone === 'track')
  const fill = bar.segments.find(segment => segment.tone === 'fill')
  return <div className={cn('country-progress-card', className)} style={style}>
    <p className="country-progress-name">{name}</p>
    <p className="country-progress-note">{note}</p>
    <div className="country-progress-next" aria-hidden="true">
      <div className="country-progress-markers">
        <span className="country-progress-track"><span style={{ width: `${fill.width / track.width * 100}%` }} /></span>
        {bar.markers.map((marker, index) => <img key={index} src={marker.src} alt="" width={14} height={14} />)}
      </div>
      <div className={cn('country-progress-box', bar.box.glow && 'shadow-box-ready')}>
        <Image loading="lazy" src={bar.box.src} alt="" className={bar.box.crop ? 'country-progress-box-crop' : ''} />
      </div>
    </div>
    <div className="country-progress-lifetime">
      <div className="country-progress-lifetime-heading"><p>Lifetime</p><span>{rank}</span></div>
      <div className="country-progress-lifetime-track" aria-hidden="true"><span style={{ width: `${lifetime.fill.width / lifetime.track.width * 100}%` }} /></div>
      <div className="country-progress-totals"><span>{lifetimeTotal}</span><span>{nextRank}</span></div>
    </div>
  </div>
}
