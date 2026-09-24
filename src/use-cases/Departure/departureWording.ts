import type { Audience } from '@contracts/api'

/** Followers "unfollow"; contacts become "past contacts". */
export const departureTitles: Record<Audience, string> = {
  followers: 'Unfollowers',
  contacts: 'Past connections',
}
