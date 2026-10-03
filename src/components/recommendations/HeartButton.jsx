import { cn } from '../../utils/cn'

export default function HeartButton({ dishName, liked = false, onToggle, className, size = 27.617 }) {
  return (
    <button type="button" aria-pressed={liked}
      aria-label={liked ? `Remove ${dishName} from favorites` : `Save ${dishName} to favorites`}
      onClick={event => { event.stopPropagation(); onToggle?.() }}
      className={cn('absolute size-[44px]', className)}>
      <svg aria-hidden="true" viewBox="0 0 27.6174 27.6174" className="absolute top-0 right-0 max-w-none" style={{ width: size, height: size }} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3.4523 11.1412C3.43211 17.1194 13.8059 23.0144 13.8059 23.0144C13.8059 23.0144 24.1855 17.1194 24.1653 11.1412C24.1549 8.07483 21.6222 5.75765 18.9885 5.75363C16.3547 5.74962 14.9621 7.37184 13.8059 8.45064C12.6498 7.37184 11.2628 5.74961 8.6291 5.75363C5.99536 5.75764 3.46265 8.07483 3.4523 11.1412Z" stroke="var(--color-favorite)" strokeWidth="1.72609" strokeLinecap="round" fill={liked ? 'var(--color-favorite)' : 'none'} />
      </svg>
    </button>
  )
}
