import type { DetectedCard } from '../../domain/Deduplication.ts'

/**
 * Port: turns one screenshot image into the person cards visible in it (name, headline, company,
 * and both avatar-frame readings). The real adapter is ScreenshotCardReader.ts; tests use fakes.
 */
export interface CardReader {
  readCards: (image: Buffer, fileName: string) => Promise<DetectedCard[]>
}
