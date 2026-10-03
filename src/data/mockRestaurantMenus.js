/** Canonical catalog IDs for deliberately simulated Cambodian menus.
 * These are development fixtures, not verified restaurant availability.
 */
export const CAMBODIAN_MENU_IDS = ['lort-cha', 'num-banh-chok', 'bai-sach-chrouk']

export function restaurantServesDish(restaurant, dishId) {
  return restaurant.dishId === dishId || restaurant.cuisine === 'Cambodian' && CAMBODIAN_MENU_IDS.includes(dishId)
}
