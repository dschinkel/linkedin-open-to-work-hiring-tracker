import type { DetectedCard } from '../../domain/Deduplication.ts'

export interface CardReader {
  readCards: (image: Buffer, fileName: string) => Promise<DetectedCard[]>
}
