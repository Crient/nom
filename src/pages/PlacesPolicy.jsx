import HubLayout from '../components/layout/HubLayout'

export default function PlacesPolicy({ privacy = false }) {
  return <HubLayout title="Nom" accent={privacy ? 'Privacy' : 'Terms'}>
    <div className="nearby-policy">
      {privacy ? <>
        <p>Nearby restaurant search uses browser location when you choose to search, or when you open a dish after granting location permission. Nom checks its cache first and rounds coordinates to approximately a kilometre before sending them to its server and Google Places. Location permission is optional; dish discovery remains usable without it.</p>
        <p>Search results remain in the current app session. Local storage retains nearby Google Place IDs and venue coordinates for up to 24 hours, together with the selected dish and approximate search area. Names, addresses, ratings, hours, photo references and reviews are not saved in browser storage. Saved restaurant favorites retain Place IDs. You can clear local browser data to remove these records.</p>
        <p>Venue photos load as cards become visible. Choosing a restaurant can load its Google details and reviews; choosing Map or viewing a restaurant’s location preview loads Google’s interactive map. These features contact Google and use temporary session data. Photo and review credits link to their Google Maps sources.</p>
        <p>The server uses location transiently to search; its application diagnostics record fixed error codes and request counts, not locations or credentials. Google and the hosting provider process requests under their own policies.</p>
      </> : <>
        <p>Nearby results help you discover restaurants. Appearance in a dish or cuisine search does not confirm menu availability. Ratings and opening information are provided by Google; check Google Maps or contact the restaurant before visiting. Distances are approximate straight-line distances.</p>
        <p>Use of Google Maps content is subject to the <a href="https://maps.google.com/help/terms_maps/" target="_blank" rel="noopener noreferrer">Google Maps/Google Earth Additional Terms of Service</a>.</p>
      </>}
      <p>Google processes Places requests under the <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a>.</p>
    </div>
  </HubLayout>
}
