import { Link } from 'react-router-dom'
import NomNavigation from '../components/layout/NomNavigation'
import StatusBar from '../components/layout/StatusBar'
import CountryProgressCard from '../components/ui/CountryProgressCard'
import SearchField from '../components/ui/SearchField'
import Image from '../components/ui/Image'
import { useExperience } from '../context/Experience'
import { collectionCountries, BOX_TARGET } from '../data/collectionDefinitions'
import { countryProgressPresentation, pendingBox } from '../utils/experienceProgress'
import { dishes } from '../data/dishes'
import { recentlyExplored } from '../data/recentlyExplored'
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
  { label: 'Trending', icon: quickTrending }, { label: 'Scan', icon: quickScan },
  { label: 'Log Meal', icon: quickLogMeal, to: '/discover/food-type' }, { label: 'Favorites', icon: quickFavorites },
  { label: 'Progress', icon: quickProgress, to: '/collections' },
]

export default function Home() {
  const { state } = useExperience()
  const cambodia = collectionCountries[0]
  const box = pendingBox(state, cambodia.id)
  const remaining = BOX_TARGET - state.progress.cambodia.count
  return (
    <div className="min-h-[1260px] w-full bg-surface pb-[90px]">
      <header className="relative h-[295.48px]">
        <StatusBar />
        <SearchField disabled aria-label="Search for food (unavailable)" placeholder="Search for food..." title="Food search is not available yet" className="absolute top-[55.01px] left-0 w-full" />
        <div className="absolute top-[126.89px] left-[18.63px] right-[23.94px] bg-surface py-[16.017px]">
          <div className="grid grid-cols-5 gap-[6px] px-[16.017px]">
            {QUICK_ACTIONS.map(({ label, icon, to }) => {
              const Control = to ? Link : 'button'
              return <Control key={label} {...(to ? { to } : { type: 'button', disabled: true, title: `${label} is not available yet` })} className="flex min-h-[44px] min-w-0 flex-col items-center gap-[6.007px] text-text-secondary">
                <img src={icon} alt="" className="size-[24.026px] shrink-0" />
                <span className="text-[clamp(11px,3cqw,12.969px)] leading-normal font-semibold tracking-meta whitespace-nowrap">{label}</span>
              </Control>
            })}
          </div>
        </div>
        <img src={greetingDivider} alt="" className="absolute top-[196.1px] left-[9.28%] h-[14.197px] w-[75.62%]" />
        <div className="absolute top-[203.2px] left-[10.65px] right-0 flex flex-col gap-[4.695px] bg-surface p-[18.778px] text-text-primary">
          <h1 className="text-greeting [text-shadow:0_3.549px_3.549px_rgb(0_0_0/0.25)]">Good Morning, Leng!</h1>
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
          <button type="button" disabled title="Surprise me is not available yet" className="flex h-[116.239px] min-w-0 flex-col items-center justify-center gap-[8.075px] rounded-[10.324px] border-[0.86px] border-strong-neutral/20">
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
        <Link to={box ? `/boxes/${box.id}` : '/collections/cambodia'} className="relative flex min-h-[44px] items-center justify-center gap-[5px] rounded-card bg-primary-teal px-[4px] text-action-label tracking-meta text-strong-neutral">
          {box ? 'Open Box' : 'Explore Now'} <img src={chevronSm} alt="" className="h-[10.665px] w-[6.301px] shrink-0" />
        </Link>
      </section>

      <div className="mt-[11.53px] flex items-center justify-between pl-[17.75px] pr-[24px]">
        <h2 className="text-section-title text-text-primary">Your Progress</h2>
        <Link to="/collections" className="flex min-h-[44px] items-center text-link tracking-meta text-accessible-teal">View All Progress <img src={chevronSm} alt="" className="inline h-[10.665px] w-[6.301px]" /></Link>
      </div>
      <div className="mx-[23.96px] mt-[5.03px] flex flex-col gap-[8.88px]">
        {collectionCountries.slice(0, 3).map(country => <Link key={country.id} to={`/collections/${country.id}`} aria-label={`View ${country.name} progress`}><CountryProgressCard {...countryProgressPresentation(state, country)} /></Link>)}
      </div>

      <div className="mt-[15.1px] flex items-center justify-between px-[23.07px]">
        <h2 className="text-section-title font-semibold text-text-primary">Recently Explored</h2>
        <span aria-disabled="true" className="text-link tracking-meta text-accessible-teal">See all <img src={chevronSm} alt="" className="inline h-[10.665px] w-[6.301px]" /></span>
      </div>
      <section aria-label="Recently explored previews" tabIndex={0} className="flex gap-[9.316px] overflow-x-auto px-[9.76px] pb-[6px]">
        {state.logs.slice(-3).reverse().map(log => <Link key={log.id} to={`/visits/${log.id}/logged`} className="flex h-[80.746px] w-[165.634px] shrink-0 flex-col justify-center rounded-sm bg-field/20 px-3 shadow-raised"><strong className="text-body-sm">{dishes.find(dish => dish.id === log.dishId)?.name ?? 'Logged meal'}</strong><span className="text-meta text-text-secondary">Experience logged • {log.verification.verified ? 'Demo verified' : 'Unverified'}</span></Link>)}
        {recentlyExplored.map(entry => <RecentCard key={entry.id} {...entry} />)}
      </section>
      <NomNavigation className="fixed bottom-0 left-1/2 w-full max-w-app -translate-x-1/2 items-start bg-surface py-[9.389px]" />
    </div>
  )
}

function RecentCard({ card, media, text }) {
  return (
    <div className="relative h-[80.746px] w-[165.634px] shrink-0 rounded-sm bg-field/20 shadow-raised">
      {media.map((layer, index) => layer.kind === 'fill' ? (
        <div key={index} className="absolute rounded-sm" style={{ left: layer.left - card.left, top: layer.top - 1039.06, width: layer.width, height: layer.height, backgroundColor: layer.color }} />
      ) : (
        <Image key={index} loading="lazy" src={layer.src} alt="" className={`absolute object-cover ${layer.rounded ? 'rounded-sm' : ''}`} style={{ left: layer.left - card.left, top: layer.top - 1039.06, width: layer.width, height: layer.height }} />
      ))}
      <div className="absolute top-[11.7px] flex h-[49.15px] flex-col items-start pr-[12.83px] tracking-recent whitespace-nowrap" style={{ left: text.left - card.left, width: text.width }}>
        <p className="text-recent-title text-strong-neutral">{text.title}</p>
        {text.lines.map((segments, index) => <p key={index} className="text-recent-sub text-text-secondary">{segments.map((segment, i) => <span key={i}>{segment.text}</span>)}</p>)}
      </div>
    </div>
  )
}
