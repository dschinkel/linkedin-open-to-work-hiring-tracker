export interface VisibleIdentity {
  displayName: string
  headline: string | null
  companyName: string | null
}

/** "John  SMITH" / "Staff Engineer" / "Acme" → "john smith|staff engineer|acme". Browser-safe; hashing lives in identity.ts. */
export function normalizeIdentity(identity: VisibleIdentity): string {
  return [identity.displayName, identity.headline, identity.companyName].map(normalizeField).join('|')
}

function normalizeField(field: string | null): string {
  return (field ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
}
