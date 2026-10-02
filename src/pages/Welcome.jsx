import BottomNav from '../components/layout/BottomNav'
import CollectionIcon from '../components/icons/CollectionIcon'
import Button from '../components/ui/Button'
import background from '../assets/welcome-background.png'
import ziggy from '../assets/mascots/ziggy.png'
import arrowRight from '../assets/icons/arrow-right.svg'
import profileIcon from '../assets/icons/profile.svg'
import navHome from '../assets/icons/nav-home.svg'
import navDiscover from '../assets/icons/nav-discover.svg'
import navProfile from '../assets/icons/nav-profile.svg'

/**
 * Figma: 04 — Final Design / 01 - Discovery / welcome frame (330:8131), 440x956.
 *
 * The artwork, gradients and wordmark are stacked at fixed offsets because the
 * composition overlaps; the sheet lays its buttons out in flow.
 */
/* `max-w-none` keeps the icons at their exported size — Tailwind's image
   reset would otherwise clamp the wider ones to the tab's content box. */
const NAV_ITEMS = [
  {
    label: 'Home',
    icon: <img src={navHome} alt="" className="size-[23.258px] max-w-none shrink-0" />,
  },
  {
    label: 'Discover',
    icon: <img src={navDiscover} alt="" className="h-[28.777px] w-[25.937px] max-w-none shrink-0" />,
  },
  { label: 'Collection', icon: <CollectionIcon className="relative size-[25.937px] shrink-0" /> },
  {
    label: 'Profile',
    icon: <img src={navProfile} alt="" className="size-[28.295px] max-w-none shrink-0" />,
  },
]

export default function Welcome() {
  return (
    <div className="relative h-frame w-full overflow-hidden bg-canvas-cream">
      <div className="absolute top-0 left-[-4.75px] h-[705.116px] w-[449.478px] overflow-hidden">
        <img
          src={background}
          alt=""
          className="absolute top-[-11.54%] left-0 h-[138.5%] w-full max-w-none"
        />
      </div>

      {/* Artwork fades to white above the sheet, and to sky at the very top. */}
      <div className="absolute top-[305.29px] left-[-4.75px] h-[415.147px] w-[449.478px] bg-gradient-to-b from-transparent to-surface" />
      <div className="absolute top-[-34px] left-[-4px] h-[415.147px] w-[449.478px] bg-gradient-to-t from-transparent to-sky" />

      <img
        src={ziggy}
        alt="Ziggy, the Nom mascot"
        className="absolute top-[292.37px] left-1/2 size-[366.463px] max-w-none -translate-x-1/2 rotate-[-6.03deg] object-cover"
      />

      <p className="absolute top-[116.73px] left-1/2 -translate-x-1/2 text-wordmark whitespace-nowrap text-brand-teal [text-shadow:0_2.113px_5.282px_var(--color-brand-teal-shadow)]">
        nom
      </p>
      <p className="absolute top-[187.84px] left-1/2 -translate-x-1/2 text-tagline whitespace-nowrap text-strong-neutral">
        Figure out your next bite
      </p>

      <div className="absolute top-[594.28px] left-0 flex h-[361.111px] w-full flex-col gap-[7.39px] rounded-sheet bg-canvas-cream px-gutter pt-[50.1px] shadow-sheet">
        <Button size="cta" variant="primary">
          Get Started
          <img src={arrowRight} alt="" className="size-[30.634px]" />
        </Button>

        <Button size="cta" variant="secondary">
          Profile
          <img src={profileIcon} alt="" className="size-[25.352px]" />
        </Button>
      </div>

      <BottomNav
        items={NAV_ITEMS}
        className="absolute top-[867.27px] left-1/2 w-[442.112px] -translate-x-1/2"
      />
    </div>
  )
}
