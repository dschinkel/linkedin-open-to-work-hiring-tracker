import { createHash } from 'node:crypto'

export interface VisibleIdentity {
  displayName: string
  headline: string | null
  companyName: string | null
}

/** Deterministic pseudonymous key for a visible person. No face recognition, only visible text. */
export function personHash(identity: VisibleIdentity): string {
  return createHash('sha256').update(normalizeIdentity(identity)).digest('hex')
}

export function normalizeIdentity(identity: VisibleIdentity): string {
  return [identity.displayName, identity.headline, identity.companyName].map(normalizeField).join('|')
}

function normalizeField(field: string | null): string {
  return (field ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
}
