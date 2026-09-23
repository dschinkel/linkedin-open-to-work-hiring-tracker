import type { TimeWindow, TitleTrends } from '../../../contracts/api.ts'
import { openToWorkByTitle } from '../domain/JobTitles.ts'
import { withinWindow } from '../domain/TimeWindow.ts'
import type { TrackerPorts } from '../domain/TrackerAnalytics.ts'

/** Which job families are Open to Work, and how that's changing, for people whose title could be read. */
export const viewTitleTrends = ({ analytics }: TrackerPorts) => ({
  viewTitleTrends: (window: TimeWindow): TitleTrends => {
    const { index, timeline } = analytics()
    return openToWorkByTitle(index, withinWindow(timeline, window))
  },
})
