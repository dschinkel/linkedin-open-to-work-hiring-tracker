import { createHash } from 'node:crypto'
import { normalizeIdentity, type VisibleIdentity } from '../../shared/domain/IdentityText.ts'

export { normalizeIdentity, type VisibleIdentity }

/** Deterministic pseudonymous key for a visible person. No face recognition, only visible text. */
export function personHash(identity: VisibleIdentity): string {
  return createHash('sha256').update(normalizeIdentity(identity)).digest('hex')
}
