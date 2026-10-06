import { useId } from 'react'
import ate from '../../assets/experience/ate-here.webp'

/** Reuse the original artwork: two small jaw rotations, with a fixed body seam. */
export default function AteHereMascot({ eating = false }) {
  const id = useId(), upper = `${id}-upper`, lower = `${id}-lower`, body = `${id}-body`
  return <span className={`restaurant-ate-mascot ${eating ? 'is-eating' : ''}`} data-eating={eating} aria-hidden="true">
    <img className="restaurant-ate-rest" src={ate} alt="" draggable="false" />
    <svg className="restaurant-ate-chew" viewBox="0 0 512 512" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={upper}><rect width="512" height="246" /></clipPath>
        <clipPath id={lower}><rect y="246" width="512" height="266" /></clipPath>
        <clipPath id={body}><rect y="207" width="243" height="84" /></clipPath>
      </defs>
      <g className="restaurant-ate-jaw restaurant-ate-jaw-upper"><image href={ate} width="512" height="512" clipPath={`url(#${upper})`} /></g>
      <g className="restaurant-ate-jaw restaurant-ate-jaw-lower"><image href={ate} width="512" height="512" clipPath={`url(#${lower})`} /></g>
      <image href={ate} width="512" height="512" clipPath={`url(#${body})`} />
    </svg>
  </span>
}
