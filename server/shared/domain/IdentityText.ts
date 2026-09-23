export interface VisibleIdentity {
  displayName: string
  headline: string | null
  companyName: string | null
}

/**
 * A person is known by their name alone: "John  SMITH" → "john smith". Headlines get cut off at screenshot
 * edges and change over time, so they would split one person into several. Browser-safe; hashing lives in identity.ts.
 */
export function normalizeIdentity(identity: VisibleIdentity): string {
  return normalizeField(identity.displayName)
}

function normalizeField(field: string | null): string {
  return (field ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
}
