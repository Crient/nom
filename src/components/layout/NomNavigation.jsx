import BottomNav from './BottomNav'
import CollectionIcon from '../icons/CollectionIcon'
import navHome from '../../assets/icons/nav-home.svg'
import navDiscover from '../../assets/icons/nav-discover.svg'
import navProfile from '../../assets/icons/nav-profile.svg'

const ITEMS = [
  { label: 'Home', to: '/home', icon: <img src={navHome} alt="" className="size-[23.153px] shrink-0" /> },
  { label: 'Discover', to: '/discover/food-type', icon: <img src={navDiscover} alt="" className="h-[28.647px] w-[25.82px] shrink-0" /> },
  { label: 'Collection', icon: <CollectionIcon className="size-[25.82px] shrink-0" /> },
  { label: 'Profile', icon: <img src={navProfile} alt="" className="size-[28.167px] shrink-0" /> },
]

export default function NomNavigation({ className }) {
  return <BottomNav items={ITEMS} className={className} />
}
