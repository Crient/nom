import StatusBar from '../layout/StatusBar'
import MatchBadge from './MatchBadge'
import SessionChip from './SessionChip'
import backBackground from '../../assets/icons/detail-back-bg.svg'
import backIcon from '../../assets/icons/detail-back.svg'
import Image from '../ui/Image'

export default function DishDetailHero({ result, chips, onBack }) {
  const { dish, score } = result

  return (
    <section className="relative overflow-hidden pt-[256px] pb-[5px]">
      <div className="absolute top-[-23px] left-0 h-[405px] w-full overflow-hidden rounded-t-[20px]">
        <Image
          src={dish.image}
          alt={dish.name}
          className="absolute top-[5.33%] left-[-31.13%] h-[92.4%] w-[137.24%] max-w-none object-cover"
        />
      </div>
      <StatusBar overlay />
      <button
        type="button"
        onClick={onBack}
        aria-label="Go back to recommendations"
        className="absolute top-[63.5px] left-[12.5px] z-20 size-[44px]"
      >
        <img src={backBackground} alt="" className="absolute top-[4.5px] left-[4.5px] max-w-none" />
        <img src={backIcon} alt="" className="absolute top-[12px] left-[15.5px] max-w-none rotate-180" />
      </button>

      <div className="relative ml-[22px] mr-[21px] min-h-[195px] rounded-[17.261px] bg-surface px-[13px] pt-[14px] pb-[22px] shadow-card">
        <div className="absolute top-[12px] right-[12px]" aria-label={`${Math.round(score)}% match`}>
          <MatchBadge percent={Math.round(score)} variant="detail" />
        </div>
        <h1 className="break-words pr-[78px] text-[35px] leading-[35px] font-bold text-strong-neutral">
          {dish.name} <span className="whitespace-nowrap">{dish.flag}</span>
        </h1>
        <p className="mt-[13px] max-w-[265px] text-[16.5px] leading-[16px] font-light text-strong-neutral">
          {dish.shortDescription}
        </p>
        <div className="mt-[14px] flex flex-wrap gap-x-[8px] gap-y-[10px]">
          {chips.map((chip) => (
            <SessionChip
              key={chip.id}
              chip={chip}
              variant="detail"
              className={chip.kind === 'adventure'
                ? 'min-w-[129px]'
                : chip.kind === 'region' ? 'min-w-[155px]' : 'min-w-[min(118px,calc((100%-16px)/3))]'}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
