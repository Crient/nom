import { useNavigate } from 'react-router-dom'
import NomNavigation from '../components/layout/NomNavigation'
import Image from '../components/ui/Image'
import Button from '../components/ui/Button'
import background from '../assets/welcome-background.webp'
import ziggy from '../assets/mascots/ziggy.webp'
import arrowRight from '../assets/icons/arrow-right.svg'
import profileIcon from '../assets/icons/profile.svg'

/**
 * Figma: 04 — Final Design / 01 - Discovery / welcome frame (330:8131), 440x956.
 *
 * The artwork, gradients and wordmark are stacked at fixed offsets because the
 * composition overlaps; the sheet lays its buttons out in flow.
 */
export default function Welcome() {
  const navigate = useNavigate()

  return (
    <div className="relative h-frame w-full overflow-hidden bg-canvas-cream">
      <div className="absolute top-0 left-[-4.75px] h-[705.116px] w-[449.478px] overflow-hidden">
        <Image
          src={background}
          alt=""
          className="absolute top-[-11.54%] left-0 h-[138.5%] w-full max-w-none"
        />
      </div>

      {/* Artwork fades to white above the sheet, and to sky at the very top. */}
      <div className="absolute top-[305.29px] left-[-4.75px] h-[415.147px] w-[449.478px] bg-gradient-to-b from-transparent to-surface" />
      <div className="absolute top-[-34px] left-[-4px] h-[415.147px] w-[449.478px] bg-gradient-to-t from-transparent to-sky" />

      <Image
        src={ziggy}
        alt="Ziggy, the Nom mascot"
        className="absolute top-[292.37px] left-1/2 size-[366.463px] max-w-none -translate-x-1/2 rotate-[-6.03deg] object-cover"
      />

      <h1 className="absolute top-[116.73px] left-1/2 -translate-x-1/2 text-wordmark whitespace-nowrap text-accessible-teal [text-shadow:0_2.113px_5.282px_var(--color-brand-teal-shadow)]">
        nom
      </h1>
      <p className="absolute top-[187.84px] left-1/2 -translate-x-1/2 text-tagline whitespace-nowrap text-strong-neutral">
        Figure out your next bite
      </p>

      <div className="absolute top-[594.28px] left-0 flex h-[361.111px] w-full flex-col gap-[7.39px] rounded-sheet bg-canvas-cream px-sheet-gutter pt-[50.1px] shadow-sheet">
        <Button size="cta" variant="primary" onClick={() => navigate('/home')}>
          Get Started
          <img src={arrowRight} alt="" className="size-[30.634px]" />
        </Button>

        <Button size="cta" variant="secondary" onClick={() => navigate('/profile')}>
          Profile
          <img src={profileIcon} alt="" className="size-[25.352px]" />
        </Button>
      </div>

      <NomNavigation
        className="absolute top-[867.27px] left-1/2 w-full -translate-x-1/2"
      />
    </div>
  )
}
