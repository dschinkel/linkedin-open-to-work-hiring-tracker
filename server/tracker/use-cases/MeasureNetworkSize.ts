import type { NetworkSize } from '../../../contracts/api.ts'
import { networkSize } from '../domain/NetworkSize.ts'
import type { TrackerPorts } from '../domain/TrackerAnalytics.ts'

/** How many followers or contacts you have now, counting each person once across recent scans. */
export const measureNetworkSize = ({ analytics }: TrackerPorts) => ({
  measureNetworkSize: (): NetworkSize => networkSize(analytics().index),
})
