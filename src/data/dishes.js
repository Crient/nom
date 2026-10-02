import dishLortCha from '../assets/food/dish-lort-cha.png'
import dishMieGoreng from '../assets/food/dish-mie-goreng.png'
import dishPancitCanton from '../assets/food/dish-pancit-canton.jpeg'
import dishCharKwayTeow from '../assets/food/dish-char-kway-teow.jpeg'
import dishMiQuang from '../assets/food/dish-mi-quang.png'
import dishHokkienMee from '../assets/food/dish-hokkien-mee.jpeg'
import dishKoloMee from '../assets/food/dish-kolo-mee.jpeg'
import dishPancitBihon from '../assets/food/dish-pancit-bihon.jpeg'
import dishCaoLau from '../assets/food/dish-cao-lau.jpeg'
import dishNumBanhChok from '../assets/food/dish-num-banh-chok.jpeg'

/**
 * V1 dish catalog — the ten dishes painted in 04 / 02 Recommendations.
 *
 * familiarity is 1 (familiar), 2 (different), or 3 (adventurous).
 * surprise-me is a session behaviour, never a dish value.
 *
 * flavors may include descriptive ids that are not discovery picker options
 * (savory, smoky, bold, light). Matching against a session still uses exact
 * discovery-flavor ids only.
 *
 * There is no tags array. UI tags are projected later from these fields.
 *
 * Long `description` exists in Figma only for Lort Cha (02.03). Other dishes
 * reuse their card shortDescription rather than inventing detail-page copy.
 */
export const dishes = [
  {
    id: 'lort-cha',
    name: 'Lort Cha',
    country: 'Cambodia',
    flag: '🇰🇭',
    region: 'southeast-asia',
    foodType: 'noodle',
    flavors: ['savory', 'comforting', 'smoky'],
    familiarity: 3,
    image: dishLortCha,
    shortDescription: 'Cambodian stir-fried rice noodles with beef, egg, and chives.',
    description:
      "Lort Cha is a popular Cambodian street food made with short, chewy rice noodles, stir-fried with beef, egg, bean sprouts, and chives. It's savory, slightly smoky, and full of flavor.",
  },
  {
    id: 'mie-goreng',
    name: 'Mie Goreng',
    country: 'Indonesia',
    flag: '🇮🇩',
    region: 'southeast-asia',
    foodType: 'noodle',
    flavors: ['savory', 'bold'],
    familiarity: 2,
    image: dishMieGoreng,
    shortDescription: 'Indonesian stir-fried noodles with a sweet-savory flavor.',
    description: 'Indonesian stir-fried noodles with a sweet-savory flavor.',
  },
  {
    id: 'pancit-canton',
    name: 'Pancit Canton',
    country: 'Philippines',
    flag: '🇵🇭',
    region: 'southeast-asia',
    foodType: 'noodle',
    flavors: ['savory', 'bold'],
    familiarity: 2,
    image: dishPancitCanton,
    shortDescription: 'Filipino stir-fried noodles with vegetables and meat/seafood.',
    description: 'Filipino stir-fried noodles with vegetables and meat/seafood.',
  },
  {
    id: 'char-kway-teow',
    name: 'Char Kway Teow',
    country: 'Malaysia',
    flag: '🇲🇾',
    region: 'southeast-asia',
    foodType: 'noodle',
    flavors: ['savory', 'smoky'],
    familiarity: 2,
    image: dishCharKwayTeow,
    shortDescription: 'Malaysian stir-fried flat rice noodles with a smoky, savory flavor.',
    description: 'Malaysian stir-fried flat rice noodles with a smoky, savory flavor.',
  },
  {
    id: 'mi-quang',
    name: 'Mì Quảng',
    country: 'Vietnam',
    flag: '🇻🇳',
    region: 'southeast-asia',
    foodType: 'noodle',
    flavors: ['savory', 'fresh', 'rich'],
    familiarity: 3,
    image: dishMiQuang,
    shortDescription: 'Vietnamese turmeric noodles with herbs, peanuts, and a little rich broth.',
    description: 'Vietnamese turmeric noodles with herbs, peanuts, and a little rich broth.',
  },
  {
    id: 'hokkien-mee',
    name: 'Hokkien Mee',
    country: 'Singapore',
    flag: '🇸🇬',
    region: 'southeast-asia',
    foodType: 'noodle',
    flavors: ['rich', 'savory'],
    familiarity: 2,
    image: dishHokkienMee,
    shortDescription: 'Singaporean noodles tossed in a rich, savory seafood sauce.',
    description: 'Singaporean noodles tossed in a rich, savory seafood sauce.',
  },
  {
    id: 'kolo-mee',
    name: 'Kolo Mee',
    country: 'Malaysia',
    flag: '🇲🇾',
    region: 'southeast-asia',
    foodType: 'noodle',
    flavors: ['savory', 'light'],
    familiarity: 2,
    image: dishKoloMee,
    shortDescription: 'Springy Malaysian dry noodles with savory sauce and flavorful toppings.',
    description: 'Springy Malaysian dry noodles with savory sauce and flavorful toppings.',
  },
  {
    id: 'pancit-bihon',
    name: 'Pancit Bihon',
    country: 'Philippines',
    flag: '🇵🇭',
    region: 'southeast-asia',
    foodType: 'noodle',
    flavors: ['comforting', 'savory'],
    familiarity: 2,
    image: dishPancitBihon,
    shortDescription: 'Filipino rice noodles stir-fried with vegetables and your choice of protein.',
    description: 'Filipino rice noodles stir-fried with vegetables and your choice of protein.',
  },
  {
    id: 'cao-lau',
    name: 'Cao Lầu',
    country: 'Vietnam',
    flag: '🇻🇳',
    region: 'southeast-asia',
    foodType: 'noodle',
    flavors: ['crispy', 'fresh'],
    familiarity: 3,
    image: dishCaoLau,
    shortDescription: 'Chewy Vietnamese noodles with pork, herbs, greens, and crispy toppings.',
    description: 'Chewy Vietnamese noodles with pork, herbs, greens, and crispy toppings.',
  },
  {
    id: 'num-banh-chok',
    name: 'Num Banh Chok',
    country: 'Cambodia',
    flag: '🇰🇭',
    region: 'southeast-asia',
    foodType: 'noodle',
    flavors: ['comforting', 'fresh'],
    familiarity: 2,
    image: dishNumBanhChok,
    shortDescription: 'Cambodian rice noodles with fragrant curry gravy, herbs, and fresh vegetables.',
    description: 'Cambodian rice noodles with fragrant curry gravy, herbs, and fresh vegetables.',
  },
]
