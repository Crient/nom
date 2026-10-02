import { Link } from 'react-router-dom'
import BottomNav from '../components/layout/BottomNav'
import StatusBar from '../components/layout/StatusBar'
import CollectionIcon from '../components/icons/CollectionIcon'
import CountryProgressCard from '../components/ui/CountryProgressCard'
import SearchField from '../components/ui/SearchField'
import { countryProgress } from '../data/countryProgress'
import { recentlyExplored } from '../data/recentlyExplored'

import navHome from '../assets/icons/nav-home.svg'
import navDiscover from '../assets/icons/nav-discover.svg'
import navProfile from '../assets/icons/nav-profile.svg'

import quickTrending from '../assets/icons/quick-trending.svg'
import quickScan from '../assets/icons/quick-scan.svg'
import quickLogMeal from '../assets/icons/quick-log-meal.svg'
import quickFavorites from '../assets/icons/quick-favorites.svg'
import quickProgress from '../assets/icons/quick-progress.svg'

import greetingDivider from '../assets/icons/greeting-subtitle.svg'
import letsEatImage from '../assets/food/lets-eat.png'
import surpriseMeImage from '../assets/food/surprise-me.png'
import mysteryBannerBg from '../assets/icons/mystery-banner-bg.svg'
import mysteryBoxPromo from '../assets/collectibles/mystery-box-promo.png'
import chevronCta from '../assets/icons/chevron-right-cta.svg'
import chevronSm from '../assets/icons/chevron-right-sm.svg'

const QUICK_ACTIONS = [
  { label: 'Trending', icon: quickTrending },
  { label: 'Scan', icon: quickScan },
  { label: 'Log Meal', icon: quickLogMeal },
  { label: 'Favorites', icon: quickFavorites },
  { label: 'Progress', icon: quickProgress },
]

const NAV_ITEMS = [
  {
    label: 'Home',
    to: '/home',
    icon: <img src={navHome} alt="" className="size-[23.153px] max-w-none shrink-0" />,
  },
  {
    label: 'Discover',
    icon: <img src={navDiscover} alt="" className="h-[28.647px] w-[25.82px] max-w-none shrink-0" />,
  },
  { label: 'Collection', icon: <CollectionIcon className="size-[25.82px] shrink-0" /> },
  {
    label: 'Profile',
    icon: <img src={navProfile} alt="" className="size-[28.167px] max-w-none shrink-0" />,
  },
]

export default function Home() {
  return (
    <div className="relative h-[1260px] w-full overflow-hidden bg-surface">
      <StatusBar />

      <SearchField
        placeholder="Search for food..."
        className="absolute top-[55.01px] left-0 w-[440.113px] overflow-hidden"
      />

      <div className="absolute top-[126.89px] left-[18.63px] w-[397.43px] overflow-hidden bg-surface py-[16.017px]">
        <div className="flex items-start gap-[12.013px] px-[16.017px]">
          {QUICK_ACTIONS.map(({ label, icon }) => (
            <button
              key={label}
              type="button"
              className="flex w-[64.069px] shrink-0 flex-col items-center gap-[6.007px]"
            >
              <img src={icon} alt="" className="size-[24.026px] max-w-none shrink-0" />
              <span className="text-nav-label tracking-meta whitespace-nowrap text-text-primary">
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <img
        src={greetingDivider}
        alt=""
        className="absolute top-[196.1px] left-[40.82px] h-[14.197px] w-[332.746px] max-w-none"
      />

      <div className="absolute top-[203.2px] left-[10.65px] flex w-[440.113px] flex-col gap-[4.695px] bg-surface p-[18.778px] text-text-primary">
        <h1 className="text-greeting [text-shadow:0_3.549px_3.549px_rgb(0_0_0/0.25)]">
          Good Morning, Leng!
        </h1>
        <p className="text-greeting-sub">Tell us what you are craving for.</p>
      </div>

      <div className="absolute top-[295.48px] left-[6.21px] flex h-[144.538px] w-[426.803px] flex-col items-center justify-center overflow-hidden bg-surface py-[22.111px]">
        <div className="flex items-center justify-center gap-[30.27px] px-[21.535px] drop-shadow-tile">
          <Link
            to="/discover/food-type"
            className="flex h-[116.239px] w-[177.465px] shrink-0 flex-col items-center justify-center gap-[8.075px] rounded-[10.324px] border-[0.86px] border-solid border-tile-border bg-tile-fill"
          >
            <span className="relative size-[55.062px] overflow-hidden">
              <img
                src={letsEatImage}
                alt=""
                className="absolute top-[-15.57%] left-[-19.95%] h-[128.57%] w-[140.62%] max-w-none"
              />
            </span>
            <span className="text-tile-label tracking-tile whitespace-nowrap text-text-primary">
              Let’s Eat
            </span>
          </Link>

          <button
            type="button"
            className="flex h-[116.239px] w-[177.465px] shrink-0 flex-col items-center justify-center gap-[8.075px] rounded-[10.324px] border-[0.86px] border-solid border-strong-neutral/20"
          >
            <span className="relative size-[55.062px] overflow-hidden">
              <img
                src={surpriseMeImage}
                alt=""
                className="absolute top-[-16.28%] left-[-15.12%] size-[130.61%] max-w-none"
              />
            </span>
            <span className="text-tile-label tracking-tile whitespace-nowrap text-text-primary">
              Surprise me
            </span>
          </button>
        </div>
      </div>

      <img
        src={chevronCta}
        alt=""
        className="absolute top-[427.72px] left-[377.44px] h-[11.607px] w-[8.171px] max-w-none"
      />

      {/* Mystery box banner */}
      <img
        src={mysteryBannerBg}
        alt=""
        className="absolute top-[450.76px] left-[23.96px] h-[77.197px] w-[390.423px] max-w-none"
      />
      <img
        src={mysteryBoxPromo}
        alt=""
        className="absolute top-[458.75px] left-[29.28px] size-[62.113px] max-w-none object-cover"
      />
      <p className="absolute top-[463.18px] left-[91.39px] text-card-title tracking-meta whitespace-nowrap text-strong-neutral">
        🇰🇭 One Meal Away!
      </p>
      <p className="absolute top-[499.75px] left-[91.39px] w-[189.887px] -translate-y-1/2 text-meta-sm font-bold tracking-meta text-muted-alt">
        Try another Cambodian dish to unlock your Mystery Box.
      </p>
      <button
        type="button"
        className="absolute top-[470.28px] left-[276.85px] h-[38.155px] w-[123.338px] rounded-card bg-primary-teal"
      />
      <p className="absolute top-[489.7px] left-[291.04px] w-[77.197px] -translate-y-1/2 text-action-label tracking-meta text-pale-teal">
        Explore Now
      </p>
      <img
        src={chevronSm}
        alt=""
        className="absolute top-[484.74px] left-[378.21px] h-[10.665px] w-[6.301px] max-w-none"
      />

      {/* Your Progress */}
      <h2 className="absolute top-[539.49px] left-[17.75px] w-[402.557px] text-section-title text-text-primary">
        Your Progress
      </h2>
      <p className="absolute top-[560.69px] left-[286.61px] -translate-y-1/2 text-link tracking-meta whitespace-nowrap text-alt-teal">
        View All Progress
      </p>
      <img
        src={chevronSm}
        alt=""
        className="absolute top-[555.68px] left-[408.38px] h-[10.665px] w-[6.301px] max-w-none"
      />

      {countryProgress.map(({ id, top, left, ...card }) => (
        <CountryProgressCard key={id} {...card} className="absolute" style={{ top, left }} />
      ))}

      {/* Recently Explored */}
      <h2 className="absolute top-[1000.9px] left-[23.07px] w-[402.557px] text-section-title font-semibold text-text-primary">
        Recently Explored
      </h2>
      <p className="absolute top-[1015px] right-[83.41px] -translate-y-1/2 translate-x-full text-link tracking-meta whitespace-nowrap text-alt-teal">
        See all
      </p>
      <img
        src={chevronSm}
        alt=""
        className="absolute top-[1009.15px] left-[409.43px] h-[10.665px] w-[6.301px] max-w-none"
      />

      {recentlyExplored.map((entry) => (
        <RecentCard key={entry.id} {...entry} />
      ))}

      <BottomNav
        items={NAV_ITEMS}
        className="fixed bottom-0 left-1/2 w-full max-w-app -translate-x-1/2 items-start bg-surface py-[9.389px]"
      />
    </div>
  )
}

function RecentCard({ card, media, text }) {
  return (
    <>
      <div
        className="absolute top-[1039.06px] h-[80.746px] w-[165.634px] rounded-sm bg-field/20 shadow-raised"
        style={{ left: card.left }}
      />

      {media.map((layer, index) =>
        layer.kind === 'fill' ? (
          <div
            key={index}
            className="absolute rounded-sm"
            style={{
              left: layer.left,
              top: layer.top,
              width: layer.width,
              height: layer.height,
              backgroundColor: layer.color,
            }}
          />
        ) : (
          <img
            key={index}
            src={layer.src}
            alt=""
            className={`absolute max-w-none object-cover ${layer.rounded ? 'rounded-sm' : ''}`}
            style={{
              left: layer.left,
              top: layer.top,
              width: layer.width,
              height: layer.height,
            }}
          />
        ),
      )}

      <div
        className="absolute top-[1050.76px] flex h-[49.15px] flex-col items-start pr-[12.83px] tracking-recent whitespace-nowrap"
        style={{ left: text.left, width: text.width }}
      >
        <p className="text-recent-title text-strong-neutral">{text.title}</p>
        {text.lines.map((segments, index) => (
          <p key={index} className="text-recent-sub text-muted-alt">
            {segments.map((segment, segmentIndex) => (
              <span key={segmentIndex} className={segment.faint ? 'text-text-faint' : undefined}>
                {segment.text}
              </span>
            ))}
          </p>
        ))}
      </div>
    </>
  )
}
