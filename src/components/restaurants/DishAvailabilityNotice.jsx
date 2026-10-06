import { phoneUri } from '../../../shared/placeMedia.js'
import phone from '../../assets/experience/phone.svg'

export default function DishAvailabilityNotice({ dish, restaurant }) {
  if (!dish) return null
  const call = phoneUri(restaurant.nationalPhoneNumber), distance = restaurant.approximateDistanceMiles
  return <aside className="restaurant-call-ahead" aria-label="Dish availability advice">
    <h2>Looking for {dish.name}?</h2>
    <p>Dish availability isn't confirmed. Menu availability can change. We recommend calling ahead before making the trip.</p>
    {Number.isFinite(distance) && distance > 50 && <p>This restaurant is ~{Math.round(distance)} miles away. Call ahead to confirm {dish.name} before traveling.</p>}
    {call ? <a className="restaurant-call-ahead-action" href={call}><img src={phone} alt="" />Call restaurant</a>
      : <p className="restaurant-call-ahead-alternative">Check the restaurant’s menu or Google Maps listing before making the trip.</p>}
  </aside>
}
