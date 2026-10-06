# Nearby Restaurants development flow

This document describes the historical design/mock implementation. Production now uses the explicit Google Places provider; see [live Nearby Restaurants setup and behavior](nearby-restaurants-google-places.md). Static-map and fixture behavior below is retained for explicit design/test mode only.

Visual references in the connected Nom Figma file:

- `263:4540` — 03.01 Nearby Restaurant (List)
- `263:5531` — 03.02 Nearby Restaurant (Map)

Dish Details' **Find nearby restaurants** and **See all** actions open
`/recommendations/:dishId/nearby`. The URL carries the canonical dish ID;
navigation state carries the detail screen's recommendation return route.
Back returns to that dish, then to Matches or More Options. A valid dish without
the required discovery session returns to discovery, matching Dish Details.
`/recommendations/nearby` handles a missing dish ID explicitly.

## Provider boundary

`src/data/restaurantProvider.js` exports `findRestaurantsForDish({ dishId, signal })`.
It delegates to `mockRestaurantProvider.findByDish` and returns a promise with:

```js
{
  restaurants: [],
  source: 'mock',
  notice: 'Development preview…',
}
```

`src/data/mockRestaurants.js` holds six Figma examples associated with Lort Cha.
`mockRestaurantMenus.js` explicitly declares three canonical Cambodian demo menu
items: Lort Cha, Num Banh Chok, and Bai Sach Chrouk. The mock provider supports
those dish IDs; other dishes return an empty array. There is no country-level
fallback that pretends these restaurants serve every dish. The examples are not
verified menu data. City names are development location context, not verified addresses.

Restaurant fields: `id`, `name`, `dishId`, numeric `distance` in miles, `rating`,
`reviewCount`, numeric `priceLevel` (1–4), `address`, `isOpen`, and `image`.
Optional presentation fields are `imagePosition`, `cuisine`, `tags`, and
`reviewExcerpt`. `mapPosition: { x, y }` uses percentages on the static preview;
these positions are not geographic coordinates.

`useRestaurants` handles loading, errors/retry, request cancellation, and stale
responses. `selectRestaurants` applies restaurant-only display sorting and
filters without mutating provider records. Dish recommendations use their
existing hook, scoring, and order. Favorites Context stores restaurant IDs
separately from dish IDs; both now persist locally across refreshes when storage
is available. See `v1-consolidation.md` for the storage and recovery contract.

List cards, the selected map card, and Dish Details' restaurant previews open
`/recommendations/:dishId/nearby/:restaurantId`. Restaurant Details preserves the
selected dish and list/map return context, and its canonical menu cards open
reusable dish routes. **I ate here** starts a visit draft and opens verification.

## Design accommodations

- Dish name, flag, description, session chips, and match score are dynamic.
- Closest sorts actual distance: Red Rose (16.1 mi) precedes the 17 mi examples,
  despite the Figma list's inconsistent static order.
- City context appears beside distance and price instead of repeating cuisine.
- Long names wrap to keep the heart's 44px touch area clear. Controls retain
  Nom's accessible teal, focus rings, and minimum 44px targets.
- The map is an optimized, static Figma export with printed labels. Those labels
  differ from the list and remain part of the illustration when filters change.
  Numbered interactive markers and the selected card come from filtered data.
  The design's location control selects the closest mock result, without
  requesting geolocation or pretending to pan a live map.
  “Map preview” and the development notice distinguish this from live search.
- No geolocation request, map SDK, WebGPU, API key, or external map request is used.
- Existing restaurant images are reused; missing/failed photos use Nom's current
  plate placeholder. Six new raster exports are optimized WebP files.

## Connecting a live provider later

Implement the same async contract, normalize fields, resolve canonical dishes
to verified menu/search results, and establish a user location/distance policy.
Handle provider authentication and API keys on an appropriate server boundary.
Replace the static `RestaurantMap` renderer and percentage positions with a live
map/coordinate implementation; do not interpret preview positions as lat/lng.
Supply accurate source/notice metadata. The page, navigation, filters, card
fields, and favorites can continue using the same interface.

## Verification

Focused tests: `npm test -- src/pages/NearbyRestaurants.test.jsx src/data/restaurantProvider.test.js`.
Then `npm test` and `npm run build`.
Earlier browser checks covered list/map, controls, empty/invalid dish states,
back navigation, and layouts at 360, 375, 390, 440, and 1280px. The consolidation
session could not repeat browser checks: the in-app browser was not bound and
the sandbox blocked Chromium launch. DOM tests cover the consolidated behavior;
a fresh visual walkthrough remains required.

## Files for this feature

Created:

- `src/pages/NearbyRestaurants.jsx`
- `src/pages/NearbyRestaurants.test.jsx`
- `src/components/restaurants/RestaurantCard.jsx`
- `src/components/restaurants/RestaurantMap.jsx`
- `src/data/mockRestaurants.js`
- `src/data/restaurantProvider.js`
- `src/data/restaurantProvider.test.js`
- `src/hooks/useRestaurants.js`
- `src/styles/nearby.css`
- `src/assets/nearby/{list.svg, maps.svg, map.webp, locate.webp, promo.webp, red-rose.webp, lowell.webp, phnom-penh.webp}`
- `docs/nearby-restaurants.md`

Updated:

- `src/routes.jsx`
- `src/pages/DishDetails.jsx`
- `src/pages/DishDetails.test.jsx`
- `src/data/dishDetailsRestaurantDesignPreview.js`
- `src/context/Favorites.jsx`
- `src/components/recommendations/SessionChip.jsx`
- `src/components/ui/Button.jsx`

Earlier uncommitted catalog integration and taxonomy cleanup files were preserved.
