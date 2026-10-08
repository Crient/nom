import { normalizeSharedContent } from './sharedContent'

export const emptySocial = () => ({ profile: null, friends: [], incoming: [], outgoing: [], inbox: [], unread: 0, hasMore: false })
export function socialError(error) {
  if (['PGRST202', '42883', '42P01'].includes(error?.code)) return 'Friends setup is not available yet. Please try again after Nom’s Friends rollout.'
  if (error?.code === '23505') return 'That handle is taken. Choose another.'
  if (error?.code === '54000') return 'Please wait before sending more requests or shares.'
  if (error?.code === '42501') return 'This request is no longer available. Refresh your Friends list.'
  return 'We couldn’t complete that request. Please refresh and try again.'
}
export function createSocialRepository(client, userId) {
  async function rpc(name, params = {}) {
    const before = await client.auth.getSession()
    if (before.error || before.data?.session?.user?.id !== userId) throw new Error('Your account changed. Sign in again to continue.')
    const result = await client.rpc(name, params)
    const after = await client.auth.getSession()
    if (after.error || after.data?.session?.user?.id !== userId) throw new Error('Your account changed. Sign in again to continue.')
    if (result.error) throw new Error(socialError(result.error))
    return result.data
  }
  return {
    async load() {
      const social = await rpc('get_nom_social')
      const inbox = social.profile ? await rpc('list_nom_shared_items') : []
      return { ...emptySocial(), ...social, inbox, hasMore: inbox.length === 50 }
    },
    register: (handle, name) => rpc('register_nom_social_profile', { p_handle: handle, p_display_name: name }),
    search: query => rpc('search_nom_users', { p_query: query }),
    request: handle => rpc('send_nom_friend_request', { p_receiver: handle }),
    respond: (id, accept) => rpc('respond_nom_friend_request', { p_request_id: id, p_accept: accept }),
    cancel: id => rpc('cancel_nom_friend_request', { p_request_id: id }),
    remove: handle => rpc('remove_nom_friend', { p_handle: handle }),
    open: id => rpc('open_nom_shared_item', { p_id: id }),
    older: item => rpc('list_nom_shared_items', { p_before: item.created_at, p_before_id: item.id }),
    send({ id, receiver, content, message = '' }) {
      const ref = normalizeSharedContent(content)
      if (!ref || typeof message !== 'string' || Array.from(message).length > 280) throw new Error('Choose a valid item and keep your note within 280 characters.')
      // Identity is never accepted from the caller. The database derives the sender.
      return rpc('send_nom_shared_item', { p_id: id, p_receiver: receiver, p_content_type: ref.type,
        p_content_id: ref.id, p_dish_id: ref.dishId ?? null, p_message: message })
    },
  }
}
