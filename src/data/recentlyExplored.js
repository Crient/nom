import recentFood from '../assets/food/recent-food.png'
import recentElPenol from '../assets/food/recent-el-penol.png'
import recentThmorDa from '../assets/food/recent-thmor-da.png'

/**
 * Temporary local data for the Home "Recently Explored" row.
 *
 * Each card stacks its own set of media layers in Figma, so the layers are
 * listed in paint order rather than reduced to a single image per card.
 */
export const recentlyExplored = [
  {
    id: 'el-penol',
    card: { left: 9.76 },
    media: [
      { kind: 'image', src: recentFood, left: 14.79, top: 1048.31, width: 61.067, height: 61.067, rounded: true },
      { kind: 'fill', color: '#9c1212', left: 14.94, top: 1048.37, width: 61.077, height: 62.113, rounded: true },
      { kind: 'image', src: recentElPenol, left: 20.11, top: 1060.8, width: 48.875, height: 36.07 },
    ],
    text: {
      left: 79.88,
      width: 75.196,
      title: 'El Penol',
      lines: [[{ text: '1x Bandeja paisa' }]],
    },
  },
  {
    id: 'thmor-da',
    card: { left: 184.71 },
    media: [
      { kind: 'image', src: recentFood, left: 192.11, top: 1046.29, width: 65.11, height: 65.11, rounded: true },
      { kind: 'image', src: recentThmorDa, left: 191.96, top: 1046.3, width: 65.218, height: 65.218, rounded: true },
    ],
    text: {
      left: 263.94,
      width: 85.483,
      title: 'Thmor Da',
      lines: [[{ text: '1x Sach Ko Ang' }], [{ text: '2x Lort Cha' }]],
    },
  },
  {
    id: 'panda-express',
    card: { left: 359.66 },
    media: [
      { kind: 'image', src: recentFood, left: 367.63, top: 1046.29, width: 65.11, height: 65.11, rounded: true },
    ],
    text: {
      left: 439.46,
      width: 85.483,
      title: 'Panda Express',
      lines: [
        [{ text: '1 x Plate' }],
        [{ text: '2 x ' }, { text: 'Bigger', faint: true }, { text: ' Plate' }],
      ],
    },
  },
]
