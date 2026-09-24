import type { TimeWindow, TitleTrends } from '../../../contracts/api.ts'
import { openToWorkByTitle } from '../domain/JobTitles.ts'
import { withinWindow } from '../domain/TimeWindow.ts'
import type { TrackerPorts } from '../domain/TrackerAnalytics.ts'

export const viewTitleTrends = ({ analytics }: TrackerPorts) => ({
  viewTitleTrends: (window: TimeWindow): TitleTrends => {
    const { index, timeline } = analytics()
    return openToWorkByTitle(index, withinWindow(timeline, window))
  },
})
