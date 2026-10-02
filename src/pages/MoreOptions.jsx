import { useNavigate } from 'react-router-dom'

import StatusBar from '../components/layout/StatusBar'
import chevronLeft from '../assets/icons/chevron-left.svg'

/**
 * Route placeholder only. 02.02 More Options (263:4258) is not implemented yet.
 */
export default function MoreOptions() {
  const navigate = useNavigate()

  return (
    <div className="relative h-frame w-full bg-surface">
      <StatusBar />
      <button
        type="button"
        onClick={() => navigate('/recommendations')}
        aria-label="Go back"
        className="absolute top-[75.07px] left-[30.01px] h-[22.92px] w-[9.988px] rotate-180"
      >
        <img
          src={chevronLeft}
          alt=""
          className="absolute top-[-1.439px] left-[-1.658px] h-[25.798px] w-[14.558px] max-w-none"
        />
      </button>
    </div>
  )
}
