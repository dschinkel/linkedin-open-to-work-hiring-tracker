import type { Audience } from '../../contracts/api.ts'

export const demoNetworks: Record<Audience, { peopleCount: number; seed: number }> = {
  contacts: { peopleCount: 500, seed: 2026 },
  followers: { peopleCount: 800, seed: 7331 },
}
