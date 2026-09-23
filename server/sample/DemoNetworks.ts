import type { Audience } from '../../contracts/api.ts'

/** Size and seed of each fixed demo network. Shared so the demo banner states the real numbers. */
export const demoNetworks: Record<Audience, { peopleCount: number; seed: number }> = {
  contacts: { peopleCount: 500, seed: 2026 },
  followers: { peopleCount: 800, seed: 7331 },
}
