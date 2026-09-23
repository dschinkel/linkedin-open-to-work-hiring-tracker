const screenshotExtensions = ['.png', '.jpg', '.jpeg', '.webp']

/**
 * The name a dropped screenshot is stored under, or null when it must be refused.
 * Only a plain image file name is accepted: no folders, no "..", no hidden files.
 */
export function acceptedScreenshotName(fileName: string): string | null {
  const name = fileName.trim()
  if (name === '' || name.startsWith('.') || /[/\\]/.test(name) || name.includes('..')) return null
  return hasScreenshotExtension(name) ? name : null
}

function hasScreenshotExtension(name: string): boolean {
  const lowerName = name.toLowerCase()
  return screenshotExtensions.some((extension) => lowerName.endsWith(extension))
}
