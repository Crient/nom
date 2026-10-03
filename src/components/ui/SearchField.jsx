import { cn } from '../../utils/cn'
import searchIcon from '../../assets/icons/search.svg'

/**
 * Design system 03 - Inputs / Search Bar. Rendered as a real input so it is
 * usable, with the placeholder styling the frame specifies.
 */
export default function SearchField({ placeholder, className, ...props }) {
  return (
    <div className={cn('bg-surface px-[18.778px] py-[14.084px]', className)}>
      <div className="flex w-full items-center gap-[9.389px] rounded-full bg-field py-[11.736px] pr-[56.334px] pl-[18.778px]">
        <img src={searchIcon} alt="" className="size-[28.167px] max-w-none shrink-0" />
        <input
          type="search"
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-center text-search text-text-primary placeholder:text-text-muted"
          {...props}
        />
      </div>
    </div>
  )
}
