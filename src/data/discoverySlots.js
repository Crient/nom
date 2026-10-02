/**
 * Geometry of the six option slots on the discovery question screens.
 *
 * Food Type and Flavor place their artwork identically slot for slot — same
 * card widths, image boxes, crops and mirroring — so the measurements live
 * here once and each screen supplies only its ids, labels and artwork.
 *
 * Left-hand cards are 177px wide and right-hand cards 178px, and the check
 * badge sits at a slightly different offset in each.
 */
const CHECKBOX_LEFT_CARD = { left: 141.2, top: 4.85 }
const CHECKBOX_RIGHT_CARD = { left: 143.96, top: 5.23 }

export const DISCOVERY_ROWS = [
  { top: 303, left: 8 },
  { top: 451, left: 7 },
  { top: 600, left: 6 },
]

export const DISCOVERY_SLOTS = [
  {
    width: 177,
    imageBox: { width: 67, height: 64 },
    imageCrop: { height: '104.48%', left: '-0.67%', top: '-0.46%' },
    checkbox: CHECKBOX_LEFT_CARD,
  },
  {
    width: 178,
    imageBox: { width: 80, height: 64 },
    imageCrop: { height: '125%', left: '-1.01%', top: '-6.84%' },
    flipped: true,
    checkbox: CHECKBOX_RIGHT_CARD,
  },
  {
    width: 177,
    imageBox: { width: 75, height: 67 },
    imageCrop: { height: '111.11%', left: '-1.16%', top: '-6.41%' },
    checkbox: CHECKBOX_LEFT_CARD,
  },
  {
    width: 178,
    imageBox: { width: 74, height: 64 },
    imageCrop: { height: '115.94%', left: '-0.67%', top: '-5.85%' },
    flipped: true,
    checkbox: CHECKBOX_RIGHT_CARD,
  },
  {
    width: 177,
    imageBox: { width: 70, height: 63 },
    imageCrop: { height: '111.94%', left: '0.09%', top: '-7.52%' },
    checkbox: CHECKBOX_LEFT_CARD,
  },
  {
    width: 178,
    imageBox: { width: 75, height: 64 },
    imageCrop: { height: '117.19%', left: '-0.62%', top: '-7.09%' },
    checkbox: CHECKBOX_RIGHT_CARD,
  },
]

/**
 * Pairs a screen's options with their slot geometry and groups them into the
 * three rows the frames lay out.
 */
export function buildOptionRows(options) {
  const cards = options.map((option, index) => ({ ...DISCOVERY_SLOTS[index], ...option }))

  return DISCOVERY_ROWS.map((row, index) => ({
    ...row,
    options: cards.slice(index * 2, index * 2 + 2),
  }))
}
