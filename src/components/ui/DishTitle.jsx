/** Keep the flag with the last word, allowing earlier words to wrap naturally.
 * No title clamping: the complete canonical name remains visible and readable.
 */
export default function DishTitle({ dish }) {
  const words = dish.name.trim().split(/\s+/)
  const lastWord = words.pop()
  return <>{words.length > 0 && `${words.join(' ')} `}<span className="dish-title-ending">{lastWord}{dish.flag && <> <span className="dish-title-flag" role="img" aria-label={dish.country}>{dish.flag}</span></>}</span></>
}
