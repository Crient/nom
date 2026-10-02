import { cn } from '../../utils/cn'

/**
 * The Collection tab icon is drawn as four stroked rounded rectangles in
 * Figma rather than an exportable vector, so it is reproduced here from the
 * frame's exact geometry. The rectangles are expressed proportionally because
 * the Welcome and Home frames draw the icon at slightly different sizes.
 */
const rects = [
  { left: '12.54%', top: '12.54%', width: '33.33%', height: '41.67%' },
  { left: '54.29%', top: '12.54%', width: '33.33%', height: '29.17%' },
  { left: '54.29%', top: '50.12%', width: '33.33%', height: '37.5%' },
  { left: '12.54%', top: '62.64%', width: '33.33%', height: '25%' },
]

export default function CollectionIcon({ className }) {
  return (
    <div className={cn('relative size-[25.937px]', className)}>
      {rects.map((rect) => (
        <div
          key={`${rect.left}-${rect.top}`}
          className="absolute rounded-[2.156px] border-[2.156px] border-solid border-text-primary"
          style={rect}
        />
      ))}
    </div>
  )
}
