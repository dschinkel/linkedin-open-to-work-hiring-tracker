export interface VisibleIdentity {
  displayName: string
  headline: string | null
  companyName: string | null
}

export function normalizeIdentity(identity: VisibleIdentity): string {
  return normalizeField(identity.displayName)
}

function normalizeField(field: string | null): string {
  return (field ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
}
