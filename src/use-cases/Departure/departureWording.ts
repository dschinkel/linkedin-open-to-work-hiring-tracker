import type { AudienceChoice } from '@contracts/api'

export const departureTitles: Record<AudienceChoice, string> = {
  all: 'Unfollowers and past connections',
  followers: 'Unfollowers',
  contacts: 'Past connections',
}
