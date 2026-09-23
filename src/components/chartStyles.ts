/** Shared chart geometry: small axis labels, generous spacing between them, and a slim zoom track. */
export const chartAxisTick = { fontSize: 13 }
export const chartTickGap = 40
export const chartBrush = { height: 12, travellerWidth: 6 }
export const chartMargin = { top: 12, right: 20, bottom: 0, left: 0 }
/** Line charts reserve room on the right for the latest-value labels. */
export const lineChartMargin = { ...chartMargin, right: 60 }
/** The latest-value label at the end of a trend line. */
export const endLabelFont = { fontSize: 13, fontWeight: 700 }
