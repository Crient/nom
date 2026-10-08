import { useRef, useState } from 'react'
import { cn } from '../../utils/cn'
import searchIcon from '../../assets/icons/search.svg'

/**
 * Design system 03 - Inputs / Search Bar. Rendered as a real input so it is
 * usable, with the placeholder styling the frame specifies.
 */
export default function SearchField({ placeholder, className, action, onClear, onFocus, onBlur, ...props }) {
  const input = useRef(null)
  const [focused, setFocused] = useState(false)
  const hasQuery = String(props.value ?? '').length > 0
  return (
    <div className={cn('bg-surface px-[18.778px] py-[14.084px]', className)}>
      <div className={cn('nom-search-pill flex w-full items-center gap-[9.389px] rounded-full bg-field pl-[18.778px]', action || onClear ? 'py-[3.736px] pr-[11.736px]' : 'py-[11.736px] pr-[56.334px]')}>
        <img src={searchIcon} alt="" className="size-[28.167px] max-w-none shrink-0" />
        <input
          ref={input}
          type="text"
          role="searchbox"
          inputMode="search"
          enterKeyHint="search"
          placeholder={focused ? '' : placeholder}
          onFocus={event => { setFocused(true); onFocus?.(event) }}
          onBlur={event => { setFocused(false); onBlur?.(event) }}
          className="min-w-0 flex-1 bg-transparent text-center text-search text-text-primary placeholder:text-text-muted"
          {...props}
        />
        {onClear && (hasQuery ? <button type="button" aria-label="Clear search" className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center text-text-secondary" onClick={() => { onClear(); input.current?.focus() }}><span aria-hidden="true">×</span></button> : <span aria-hidden="true" className="min-h-[44px] min-w-[44px] shrink-0" />)}
        {action}
      </div>
    </div>
  )
}
