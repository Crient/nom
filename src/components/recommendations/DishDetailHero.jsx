import StatusBar from '../layout/StatusBar'
import MatchBadge from './MatchBadge'
import SessionChip from './SessionChip'
import backBackground from '../../assets/icons/detail-back-bg.svg'
import backIcon from '../../assets/icons/detail-back.svg'

export default function DishDetailHero({ result, chips, onBack }) {
  const { dish, score } = result

  return (
    <section className="relative overflow-hidden pt-[256px] pb-[5px]">
      <div className="absolute top-[-23px] left-[-1px] h-[405px] w-[441px] overflow-hidden rounded-t-[20px]">
        <img
          src={dish.image}
          alt={dish.name}
          className="absolute top-[5.33%] left-[-31.13%] h-[92.4%] w-[137.24%] max-w-none object-cover"
        />
      </div>
      <div className="absolute inset-x-0 top-0">
        <StatusBar className="bg-transparent" />
      </div>
      <button
        type="button"
        onClick={onBack}
        aria-label="Go back to recommendations"
        className="absolute top-[68px] left-[17px] size-[35px]"
      >
        <img src={backBackground} alt="" className="absolute inset-0 max-w-none" />
        <img src={backIcon} alt="" className="absolute top-[7.5px] left-[11px] max-w-none rotate-180" />
      </button>

      <div className="relative mx-[22px] min-h-[195px] w-[397px] rounded-[17.261px] bg-surface px-[13px] pt-[14px] pb-[22px] shadow-card">
        <div className="absolute top-[12px] right-[12px]" aria-label={`${Math.round(score)}% match`}>
          <MatchBadge percent={Math.round(score)} variant="detail" />
        </div>
        <h1 className="pr-[78px] text-[35px] leading-[35px] font-bold text-strong-neutral">
          {dish.name} <span className="whitespace-nowrap">{dish.flag}</span>
        </h1>
        <p className="mt-[13px] w-[265px] text-[16.5px] leading-[14px] font-light text-strong-neutral">
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
                : chip.kind === 'region' ? 'min-w-[155px]' : 'min-w-[118px]'}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
