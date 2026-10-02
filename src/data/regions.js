import regionEastAsia from '../assets/food/region-east-asia.png'
import regionSoutheastAsia from '../assets/food/region-southeast-asia.png'
import regionSouthAsia from '../assets/food/region-south-asia.png'
import regionMiddleEast from '../assets/food/region-middle-east.png'
import regionAfrica from '../assets/food/region-africa.png'
import regionEurope from '../assets/food/region-europe.png'
import regionLatinAmerica from '../assets/food/region-latin-america.png'
import regionNorthAmerica from '../assets/food/region-north-america.png'

export const regionRows = [
  {
    top: 303,
    left: 8,
    options: [
      {
        id: 'east-asia',
        label: 'East Asia',
        subtitle: 'Japan • Korea • China',
        image: regionEastAsia,
      },
      {
        id: 'southeast-asia',
        label: 'Southeast Asia',
        subtitle: 'Vietnam • Cambodia • Philippines',
        image: regionSoutheastAsia,
      },
    ],
  },
  {
    top: 448,
    left: 8,
    options: [
      {
        id: 'south-asia',
        label: 'South Asia',
        subtitle: 'India • Pakistan • Sri Lanka',
        image: regionSouthAsia,
      },
      {
        id: 'middle-east',
        label: 'Middle East',
        subtitle: 'Lebanon • Iran • Jordan',
        image: regionMiddleEast,
      },
    ],
  },
  {
    top: 593,
    left: 7,
    options: [
      {
        id: 'africa',
        label: 'Africa',
        subtitle: 'Ethiopia • Nigeria • Morocco',
        image: regionAfrica,
      },
      {
        id: 'europe',
        label: 'Europe',
        subtitle: 'Italy • France • Greece',
        image: regionEurope,
      },
    ],
  },
  {
    top: 738,
    left: 7,
    options: [
      {
        id: 'latin-america',
        label: 'Latin American',
        subtitle: 'Mexico • Colombia • Peru',
        image: regionLatinAmerica,
        titleSize: 17.5,
      },
      {
        id: 'north-america',
        label: 'North America',
        subtitle: 'US • Canada',
        image: regionNorthAmerica,
      },
    ],
  },
]

export const SURPRISE_REGION_ID = 'surprise-me'
