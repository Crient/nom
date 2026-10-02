import typeNoodle from '../assets/food/type-noodle.png'
import typeRice from '../assets/food/type-rice.png'
import typeSoupBroth from '../assets/food/type-soup-broth.png'
import typeGrilledProtein from '../assets/food/type-grilled-protein.png'
import typeHandheld from '../assets/food/type-handheld.png'
import typeAnything from '../assets/food/type-anything.png'

/* Left-hand cards are 177px wide and right-hand cards 178px, and the check
   badge sits at a slightly different offset in each. Both offsets come from
   the final frames. */
const CHECKBOX_LEFT_CARD = { left: 141.2, top: 4.85 }
const CHECKBOX_RIGHT_CARD = { left: 143.96, top: 5.23 }

export const foodTypeRows = [
  {
    top: 303,
    left: 8,
    options: [
      {
        id: 'noodle',
        label: 'Noodle',
        image: typeNoodle,
        width: 177,
        imageBox: { width: 67, height: 64 },
        imageCrop: { height: '104.48%', left: '-0.67%', top: '-0.46%' },
        checkbox: CHECKBOX_LEFT_CARD,
      },
      {
        id: 'rice',
        label: 'Rice',
        image: typeRice,
        width: 178,
        imageBox: { width: 80, height: 64 },
        imageCrop: { height: '125%', left: '-1.01%', top: '-6.84%' },
        flipped: true,
        raised: true,
        checkbox: CHECKBOX_RIGHT_CARD,
      },
    ],
  },
  {
    top: 451,
    left: 7,
    options: [
      {
        id: 'soup-broth',
        label: 'Soup/Broth',
        image: typeSoupBroth,
        width: 177,
        imageBox: { width: 75, height: 67 },
        imageCrop: { height: '111.11%', left: '-1.16%', top: '-6.41%' },
        checkbox: CHECKBOX_LEFT_CARD,
      },
      {
        id: 'grilled-protein',
        label: 'Grilled/Protein',
        image: typeGrilledProtein,
        width: 178,
        imageBox: { width: 74, height: 64 },
        imageCrop: { height: '115.94%', left: '-0.67%', top: '-5.85%' },
        flipped: true,
        checkbox: CHECKBOX_RIGHT_CARD,
      },
    ],
  },
  {
    top: 600,
    left: 6,
    options: [
      {
        id: 'handheld',
        label: 'Handheld',
        image: typeHandheld,
        width: 177,
        imageBox: { width: 70, height: 63 },
        imageCrop: { height: '111.94%', left: '0.09%', top: '-7.52%' },
        checkbox: CHECKBOX_LEFT_CARD,
      },
      {
        id: 'anything',
        label: 'Anything',
        image: typeAnything,
        width: 178,
        imageBox: { width: 75, height: 64 },
        imageCrop: { height: '117.19%', left: '-0.62%', top: '-7.09%' },
        checkbox: CHECKBOX_RIGHT_CARD,
      },
    ],
  },
]
