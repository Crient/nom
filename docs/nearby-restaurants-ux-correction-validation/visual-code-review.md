# Nom restaurant visual-code review

Reviewed 2026-10-05 against the existing THMOR DA RestaurantDetails implementation, DishDetails preview placement, NearbyRestaurants List/Map composition, and the user-supplied restaurant hierarchy. This is a source/asset review, not rendered browser QA.

The supplied Figma file is https://www.figma.com/design/xVMCeNJV8S3axojtIgtoCr/Untitled. Metadata exposed `00 — Product` (1:2), including a product overview (315:8004), but the requested `03.03 Restaurant Details` frame was unavailable through the attempted reads. The user explicitly authorized continuing with existing Nom screen assets/design tokens. No frame-specific screenshot comparison or pixel-fidelity claim is made. The in-app browser reports no connected browser; screenshots and device interaction checks remain manual.

## Reused visual system

- AppShell's existing 440px maximum container and mobile-first container queries, Inter UI font, FlowHeader/StatusBar navigation, HeartButton, DishTag, Button, DishTitle, and Image.
- Existing `experience.css` restaurant composition: 115px navigation header; 265px hero with 15px side margins; 28px bold name; five circular actions; About and three-column canonical dish ideas.
- Existing tokens: background #f7fefd, surface #ffffff, strong neutral #000000; primary teal #14b9b5, accessible teal #006f6b, secondary fill #e2fcfa, teal tint #cdf4f2, pale teal #f2fbfb, highlight #71d7d4, success #009c5f, gold #fec62c; radius-md/full, shadow-card/panel, body/body-sm/label/meta/title/heading sizes.
- Existing Directions/Phone/Website/Friends/Share SVGs at their original intrinsic sizes, gold restaurant rating star, eating Nom `ate-here.webp`, and `ate-background.webp`. No new raster assets or altered source artwork.

## Component comparison

| Area | Comparison and source review |
| --- | --- |
| Dish preview | Same section placement, three equal grid columns and stretched heights. 4:3 images, 10px gaps, consistent inner padding, 13px token-based two-line names, compact facts without street addresses, and match labels aligned toward the bottom. Narrow content uses min-width:0 and wrapping; photo credits ellipsize on small images and expand in the hero. |
| Full list | Nom rounded white cards, pale teal border and existing panel shadow. Image 108px wide (88px below 390px), compact body text, independent favorite, and a small accessible Maps source icon. Removed the large visible external-link text. Whole-card native buttons cover blank areas and provide a visible keyboard focus outline; author/source links and hearts remain above the card button. |
| Live detail | Existing light background, navigation, rounded hero, strong name, factual distance/type/real price, gold star, green known Open status, compact factual chips, five circular actions, eating swipe, 190px lazy map, About/hours, catalog ideas, and polished review cards. Added availability advice between actions and swipe as explicitly requested. No invented Authentic/Casual chip, menu, or restaurant description. |
| Availability advice | Pale aqua surface, teal heading, body-size text and 44px direct Call restaurant action. Farther-distance copy uses approximate measured miles; no error colors, alarm icon, or alert role. Missing phone provides useful menu/Maps guidance. |
| Eating interaction | Existing eating character begins left in a rounded aqua pill using Nom artwork. Horizontal progress, subtle bite animation, short celebration, threshold/cancel handling, deliberate keyboard equivalent, reduced motion, and existing verification flow. |
| Reviews | White rounded shadowed cards with author/profile/source credits, gold stars, original text, four-line clipping, and a 44px Read more control. At most three; no generated review summary. |
| Photo credits | Small unobtrusive Photo: author caption with author profile links and accessible source icon. Full hero attribution wraps and uses safe returned profile images. Checked avatar dimensions so generic image CSS cannot expand avatars to photo height. |

## Mobile geometry review

At 360px, Dish Details' existing 42px side margins leave 318px; with two 10px gaps, each preview is about 99px wide and its 4:3 image about 75px high. At 390px it is about 109px wide. Names have two bounded lines, facts can wrap, and all three cards stretch to the tallest content. The main click target is the entire card.

For detail at 360px, 16px copy margins leave 328px. Five actions with four 4px gaps provide about 62px per slot, fitting 54px circles and intrinsic icons. The hero remains inside 15px margins; About descriptions and long addresses wrap. Maps are 190px high and preserve Google controls/branding. Existing page overflow and app-width constraints are retained. These calculations are not a replacement for real browser measurements.

## Remaining rendered checks

Check 360px/390px first, then tablet/desktop: real venue photo crops, very long names and credit lists, call-ahead notice, disabled contacts, five-action alignment, touch swipe/scroll/cancellation, focus and reduced motion, review expansion, and map controls/branding. Compare against the actual 03.03 THMOR DA frame when available. Verify actual phone/site/Share behavior and one bounded Google flow once the separate browser Maps key is configured; repeated cases use mocks.
