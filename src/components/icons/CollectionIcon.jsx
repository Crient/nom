/**
 * The Collection tab icon is drawn as four stroked rounded rectangles in
 * Figma rather than an exportable vector, so it is reproduced here from the
 * frame's exact geometry. Border-box sizing matches Figma's stroke behaviour.
 */
export default function CollectionIcon({ className }) {
  const rects = [
    { left: 3.26, top: 3.26, width: 8.646, height: 10.807 },
    { left: 14.11, top: 3.26, width: 8.646, height: 7.565 },
    { left: 14.11, top: 13.03, width: 8.646, height: 9.726 },
    { left: 3.26, top: 16.28, width: 8.646, height: 6.484 },
  ]

  return (
    <div className={className ?? 'relative size-[25.937px]'}>
      {rects.map((rect) => (
        <div
          key={`${rect.left}-${rect.top}`}
          className="absolute rounded-[2.152px] border-[2.161px] border-solid border-text-primary"
          style={{
            left: `${rect.left}px`,
            top: `${rect.top}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
          }}
        />
      ))}
    </div>
  )
}
