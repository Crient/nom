import { cn } from '../../utils/cn'
import statusCellular from '../../assets/icons/status-cellular.svg'
import statusWifi from '../../assets/icons/status-wifi.svg'
import statusCap from '../../assets/icons/status-cap.svg'

/**
 * Mock iOS status bar drawn into most of the final frames. It is device
 * chrome rather than product UI, so it lives in one component and can be
 * dropped from every screen at once.
 *
 * Figma uses SF Pro for the clock; the system font stack is the closest the
 * browser can get.
 */
export default function StatusBar({ className }) {
  return (
    <div className={cn('relative h-status-bar w-full bg-surface', className)}>
      <p
        className="absolute top-[21.52px] left-[55.79px] w-[44.6px] text-center text-[19.95px] leading-[25.82px] font-bold text-text-primary"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        9:41
      </p>

      <img
        src={statusCellular}
        alt=""
        className="absolute top-[27.62px] left-[314.45px] h-[14.349px] w-[22.534px] max-w-none"
      />
      <img
        src={statusWifi}
        alt=""
        className="absolute top-[27.74px] left-[345.79px] h-[14.469px] w-[20.118px] max-w-none"
      />

      <div className="absolute top-[26.99px] left-[379.52px] h-[15.26px] w-[29.341px] rounded-[4.3px] border-[1.174px] border-solid border-text-primary opacity-35" />
      <div className="absolute top-[29.34px] left-[381.87px] h-[10.56px] w-[24.646px] rounded-[2.5px] bg-text-primary" />
      <img
        src={statusCap}
        alt=""
        className="absolute top-[32.61px] left-[412.92px] h-[4.783px] w-[1.559px] max-w-none"
      />
    </div>
  )
}
