import type { NetworkSize } from '../../../contracts/api.ts'
import { networkSize } from '../domain/NetworkSize.ts'
import type { TrackerPorts } from '../domain/TrackerAnalytics.ts'

export const measureNetworkSize = ({ analytics }: TrackerPorts) => ({
  measureNetworkSize: (): NetworkSize => networkSize(analytics().index),
})
