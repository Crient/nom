import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import NomNavigation from '../components/layout/NomNavigation'
import StatusBar from '../components/layout/StatusBar'
import CountryProgressCard from '../components/ui/CountryProgressCard'
import SearchField from '../components/ui/SearchField'
import Image from '../components/ui/Image'
import { useExperience } from '../context/Experience'
import { collectionCountries, BOX_TARGET } from '../data/collectionDefinitions'
import { countryProgressPresentation, pendingBox } from '../utils/experienceProgress'
import { useActivity } from '../context/Activity'
import { useDiscoverySession } from '../context/DiscoverySession'
import { activityEntries } from '../utils/explorationSummary'
import ActivityCard from '../components/experience/ActivityCard'
import '../styles/hubs.css'
import quickTrending from '../assets/icons/quick-trending.svg'
import quickScan from '../assets/icons/quick-scan.svg'
import quickLogMeal from '../assets/icons/quick-log-meal.svg'
import quickFavorites from '../assets/icons/quick-favorites.svg'
import quickProgress from '../assets/icons/quick-progress.svg'
import greetingDivider from '../assets/icons/greeting-subtitle.svg'
import letsEatImage from '../assets/food/lets-eat.webp'
import surpriseMeImage from '../assets/food/surprise-me.webp'
import mysteryBannerBg from '../assets/icons/mystery-banner-bg.svg'
import mysteryBoxPromo from '../assets/collectibles/mystery-box-promo.webp'
import chevronCta from '../assets/icons/chevron-right-cta.svg'
import chevronSm from '../assets/icons/chevron-right-sm.svg'

const QUICK_ACTIONS = [
  { label: 'Trending', icon: quickTrending, to: '/explore?view=trending' }, { label: 'Scan', icon: quickScan, to: '/scan' },
  { label: 'Log Meal', icon: quickLogMeal, to: '/explore?action=log' }, { label: 'Favorites', icon: quickFavorites, to: '/favorites' },
  { label: 'Progress', icon: quickProgress, to: '/progress' },
]

export default function Home() {
  const { state } = useExperience()
  const activity = useActivity(), session = useDiscoverySession(), navigate = useNavigate(), [query, setQuery] = useState('')
  const recent = activityEntries(state.logs, activity.recentDishes).slice(0, 3)
  const surprise = () => {
    session.setFoodType('anything'); session.setAdventurousness('surprise-me'); session.setRegion('surprise-me')
    navigate(session.flavors.length ? '/recommendations' : '/discover/flavor', { state: { surpriseMode: true } })
  }
  const cambodia = collectionCountries[0]
  const box = pendingBox(state, cambodia.id)
  const remaining = BOX_TARGET - state.progress.cambodia.count
  return (
    <div className="home-page min-h-[1260px] w-full bg-surface pb-[90px]">
      <header className="home-header">
        <StatusBar className="home-status" />
        <form role="search" className="home-search" onSubmit={event => { event.preventDefault(); navigate(`/explore${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`) }}><SearchField aria-label="Search for food" placeholder="Search for food..." value={query} onChange={event => setQuery(event.target.value)} action={<button type="submit" aria-label="Search dishes" className="flex min-h-[44px] min-w-[44px] items-center justify-center"><img src={chevronSm} alt="" /></button>} /></form>
        <div className="home-quick-actions bg-surface py-[16.017px]">
          <div className="grid grid-cols-5 gap-[6px] px-[16.017px]">
            {QUICK_ACTIONS.map(({ label, icon, to }) => {
              return <Link key={label} to={to} className="flex min-h-[44px] min-w-0 flex-col items-center gap-[6.007px] text-text-secondary">
                <img src={icon} alt="" className="size-[24.026px] shrink-0" />
                <span className="text-[clamp(11px,3cqw,12.969px)] leading-normal font-semibold tracking-meta whitespace-nowrap">{label}</span>
              </Link>
            })}
          </div>
        </div>
        <img src={greetingDivider} alt="" className="home-greeting-divider" />
        <div className="relative ml-[10.65px] flex flex-col gap-[4.695px] bg-surface p-[18.778px] text-text-primary">
          <h1 className="text-greeting break-words [text-shadow:0_3.549px_3.549px_rgb(0_0_0/0.25)]">Good Morning, {activity.displayName}!</h1>
          <p className="text-greeting-sub">Tell us what you are craving for.</p>
        </div>
      </header>

      <div className="relative mx-[6.21px] flex h-[144.538px] items-center">
        <div className="grid w-full grid-cols-2 gap-[30.27px] px-[21.535px] drop-shadow-tile">
          <Link to="/discover/food-type" className="flex h-[116.239px] min-w-0 flex-col items-center justify-center gap-[8.075px] rounded-[10.324px] border-[0.86px] border-tile-border bg-tile-fill">
            <span className="relative size-[55.062px] overflow-hidden">
              <Image src={letsEatImage} alt="" className="absolute top-[-15.57%] left-[-19.95%] h-[128.57%] w-[140.62%] max-w-none" />
            </span>
            <span className="text-tile-label tracking-tile text-text-primary">Let’s Eat</span>
          </Link>
          <button type="button" onClick={surprise} className="flex h-[116.239px] min-w-0 flex-col items-center justify-center gap-[8.075px] rounded-[10.324px] border-[0.86px] border-strong-neutral/20">
            <span className="relative size-[55.062px] overflow-hidden">
              <Image src={surpriseMeImage} alt="" className="absolute top-[-16.28%] left-[-15.12%] size-[130.61%] max-w-none" />
            </span>
            <span className="text-tile-label tracking-tile text-text-primary">Surprise me</span>
          </button>
        </div>
        <img src={chevronCta} alt="" className="absolute right-[48.18px] bottom-[.7px] h-[11.607px] w-[8.171px]" />
      </div>

      <section aria-label="Mystery box preview" className="relative ml-[23.96px] mr-[25.62px] mt-[10.742px] grid min-h-[77.197px] grid-cols-[62.113px_minmax(0,1fr)_31.6%] items-center py-[8px] pl-[5.32px] pr-[14.08px]">
        <img src={mysteryBannerBg} alt="" className="pointer-events-none absolute inset-0 size-full" />
        <Image loading="lazy" src={mysteryBoxPromo} alt="" className="relative size-[62.113px] object-cover" />
        <div className="relative min-w-0">
          <p className="text-card-title tracking-meta text-strong-neutral">🇰🇭 {box ? 'Mystery Box Ready!' : `${remaining === 1 ? 'One Meal' : `${remaining} Meals`} Away!`}</p>
          <p className="mt-[11px] text-meta-sm font-bold tracking-meta text-text-secondary">{box ? 'Open your box to discover your collectible.' : 'Try another Cambodian dish to unlock your Mystery Box.'}</p>
        </div>
        <Link to={box ? `/boxes/${box.id}` : '/collections/cambodia'} state={{ returnTo: '/home' }} className="relative flex min-h-[44px] items-center justify-center gap-[5px] rounded-card bg-primary-teal px-[4px] text-action-label tracking-meta text-strong-neutral">
          {box ? 'Open Box' : 'Explore Now'} <img src={chevronSm} alt="" className="h-[10.665px] w-[6.301px] shrink-0" />
        </Link>
      </section>

      <div className="mt-[11.53px] flex items-center justify-between pl-[17.75px] pr-[24px]">
        <h2 className="text-section-title text-text-primary">Your Progress</h2>
        <Link to="/progress" className="flex min-h-[44px] items-center text-link tracking-meta text-accessible-teal">View All Progress <img src={chevronSm} alt="" className="inline h-[10.665px] w-[6.301px]" /></Link>
      </div>
      <div className="mx-[23.96px] mt-[5.03px] flex flex-col gap-[8.88px]">
        {collectionCountries.slice(0, 3).map(country => <Link key={country.id} to={`/collections/${country.id}`} state={{ returnTo: '/home' }} aria-label={`View ${country.name} progress`}><CountryProgressCard {...countryProgressPresentation(state, country)} /></Link>)}
      </div>

      <div className="mt-[15.1px] flex items-center justify-between px-[23.07px]">
        <h2 className="text-section-title font-semibold text-text-primary">Recently Explored</h2>
        <Link to="/history" className="flex min-h-[44px] items-center text-link tracking-meta text-accessible-teal">See all <img src={chevronSm} alt="" className="inline h-[10.665px] w-[6.301px]" /></Link>
      </div>
      <section aria-label="Recently explored previews" tabIndex={0} className="flex gap-[9.316px] overflow-x-auto px-[9.76px] pb-[6px]">
        {recent.length ? recent.map(entry => <ActivityCard key={entry.id} entry={entry} returnTo="/home" compact />) : <Link className="hub-action px-4 text-body-sm" to="/explore">Explore a dish to start your history.</Link>}
      </section>
      <NomNavigation fixed />
    </div>
  )
}
