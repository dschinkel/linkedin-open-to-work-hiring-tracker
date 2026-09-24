const screenshotExtensions = ['.png', '.jpg', '.jpeg', '.webp']

export function acceptedScreenshotName(fileName: string): string | null {
  const name = fileName.trim()
  if (name === '' || name.startsWith('.') || /[/\\]/.test(name) || name.includes('..')) return null
  return hasScreenshotExtension(name) ? name : null
}

export function refusalReason(fileName: string): string {
  return isPdfName(fileName) ? 'PDFs are read when dropped in the app' : 'Not a PNG, JPG, or WebP image'
}

export function isPdfName(fileName: string): boolean {
  return fileName.trim().toLowerCase().endsWith('.pdf')
}

function hasScreenshotExtension(name: string): boolean {
  const lowerName = name.toLowerCase()
  return screenshotExtensions.some((extension) => lowerName.endsWith(extension))
}
