import HubLayout from '../components/layout/HubLayout'

export default function PlacesPolicy({ privacy = false }) {
  return <HubLayout title="Nom" accent={privacy ? 'Privacy' : 'Terms'}>
    <div className="nearby-policy">
      <p>Updated October 6, 2026</p>
      {privacy ? <>
        <h2>Your food journey</h2>
        <p>Accounts are optional. Guest favorites, history, meal feedback, discovery answers, and earned progress stay in this browser when local storage is available. Returning to the same browser restores that journey. Clearing browser data removes local records. Signing out returns to this device’s separate Guest journey.</p>
        <h2>Your Nom account</h2>
        <p>Nom uses Supabase for authentication and account storage. Email/password accounts store your email and account identity. Google sign-in shares your email and basic profile with Nom; profile information may include your name and avatar. Nom does not request access to your Gmail messages or Google contacts.</p>
        <p>Your profile name, favorites, recent dish views, completed meals, feedback, and opened rewards sync across signed-in devices. Guest data is imported only after you choose Merge &amp; Sync. Discovery answers and unfinished visits stay local. Account sync stores restaurant identifiers rather than full Google Places results.</p>
        <h2>Location and visit verification</h2>
        <p>Location permission is optional. Nearby discovery rounds your search area to approximately a kilometre before sending it to Nom and Google Places. A visit location check separately requests fresh, accurate coordinates and temporarily sends them to Nom to compare against the restaurant’s location. Nom does not save your exact visit-check coordinates. It saves the verification method, time, restaurant identifier, distance, accuracy, and signed verification evidence. Location checks do not measure visit duration.</p>
        <h2>Receipts and restaurant QR</h2>
        <p>Receipt verification, when available, sends your chosen image through Nom to Google Cloud Vision for text analysis. Nom holds the raw image and extracted text only while processing the request; it does not save them in a bucket or database. The provider processes the image under its own policies. Nom stores the verification outcome, confidence, and one-way evidence fingerprints to prevent reuse. Avoid uploading payment-card details or other information that is unnecessary to verify your visit.</p>
        <p>Restaurant QR verification is available only at participating restaurants. Nom checks the signed code, restaurant identity, expiry, and whether the code has already been used.</p>
        <h2>Google Places</h2>
        <p>Restaurant search, details, photos, reviews, and interactive maps contact Google. Search results are temporary session data. Local storage can retain Google Place identifiers, restaurant coordinates, and approximate search areas for up to 24 hours. Names, addresses, ratings, hours, photo references, and reviews are not saved in that browser cache. Saved restaurant favorites retain Place identifiers.</p>
        <h2>Deletion and service records</h2>
        <p>You can delete your Nom account from Account. This removes your authentication identity and synced account records, including adopted verification evidence. Your Guest journey remains on this device until you clear it. Guest verification evidence can remain on Nom’s server so a later account merge can validate it. Nom retains hashed verification identifiers and fingerprints to detect duplicate claims. Hosting, authentication, and image-analysis providers may retain operational logs or backups under their policies; account deletion does not promise immediate erasure of all provider backups.</p>
        <p>Nom application diagnostics use fixed error codes and request counts rather than receipt images, exact visit coordinates, or credentials. Verification request budgets use hashed identifiers and expire after two days.</p>
      </> : <>
        <h2>Using Nom</h2>
        <p>Nom helps you discover dishes and keep your own food journey. You may use it as Guest or create an optional account. Keep your account credentials private and submit only meals and verification evidence that belong to you. Upload receipts you are entitled to use.</p>
        <h2>Restaurant information</h2>
        <p>Restaurant search results do not confirm that a dish is on the menu. Ratings and opening information come from Google and may change. Check Google Maps or contact the restaurant before visiting. Discovery distances are approximate straight-line distances.</p>
        <h2>Verification and rewards</h2>
        <p>Only successfully verified meals count toward verified country progress and Mystery Boxes. A dish can earn credit once per UTC day. Manual logs save your meal and feedback to History without verified rewards. Poor location readings, unmatched receipts, and invalid or reused QR codes do not earn credit. Location and receipt checks provide evidence of a visit; they cannot guarantee that a dish was eaten or that evidence was not falsified.</p>
        <p>Collectibles are in-app progress records. Nom currently offers no cash redemption or guaranteed commercial value. Retry and duplicate protection prevent the same accepted event from awarding progress twice. No paid reward or partner program is implied.</p>
        <h2>Your records</h2>
        <p>Guest storage depends on your browser. Account synchronization depends on an internet connection; pending changes remain local until they can sync. Do not rely on Nom as your only copy of important records. Account deletion removes synced data and cannot be undone.</p>
        <h2>Google content</h2>
        <p>Use of Google Maps content is subject to the <a href="https://maps.google.com/help/terms_maps/" target="_blank" rel="noopener noreferrer">Google Maps/Google Earth Additional Terms of Service</a>.</p>
      </>}
      <p>Google processes requests under the <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a>. Read Nom’s <a href={privacy ? '/terms' : '/privacy'}>{privacy ? 'Terms' : 'Privacy page'}</a>.</p>
    </div>
  </HubLayout>
}
