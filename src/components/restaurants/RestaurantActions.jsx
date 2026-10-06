import { useState } from 'react'
import { restaurantActionLinks, shareRestaurant } from '../../data/restaurantActions'
import directions from '../../assets/experience/directions.svg'
import phone from '../../assets/experience/phone.svg'
import website from '../../assets/experience/website.svg'
import friends from '../../assets/experience/friends.svg'
import share from '../../assets/experience/share.svg'

export default function RestaurantActions({ restaurant }) {
  const [notice, setNotice] = useState({ message: '' })
  const links = restaurantActionLinks(restaurant)
  const actions = [
    { label: 'Directions', icon: directions, href: links.directions },
    { label: 'Call', icon: phone, href: links.call },
    { label: 'Website', icon: website, href: links.website },
    { label: 'Send to a friend', icon: friends, action: sendToNomFriend },
    { label: 'Share', icon: share, action: send },
  ]
  function sendToNomFriend() { setNotice({ message: 'Friends on Nom are coming soon.' }) }
  async function send() { setNotice(await shareRestaurant({ restaurant })) }
  return <div className="restaurant-action-section">
    <nav className="restaurant-actions restaurant-actions-live" aria-label="Restaurant actions">
      {actions.map(action => {
        const content = <><span><img src={action.icon} alt="" /></span><strong>{action.label}</strong></>
        return action.href ? <a key={action.label} href={action.href} target={action.label === 'Call' ? undefined : '_blank'} rel="noopener noreferrer">{content}</a>
          : <button key={action.label} type="button" disabled={!action.action} aria-label={!action.action ? `${action.label} unavailable` : undefined} onClick={action.action}>{content}</button>
      })}
    </nav>
    {notice.message && <p className="restaurant-share-status" role="status">{notice.message}</p>}
    {notice.manualUrl && <label className="restaurant-share-fallback">Restaurant link<input readOnly value={notice.manualUrl} onFocus={event => event.currentTarget.select()} /></label>}
  </div>
}
