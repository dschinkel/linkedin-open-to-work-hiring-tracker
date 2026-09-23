import { z } from 'zod'

/** Which list the screenshots come from. Each audience is tracked as its own, separate dashboard. */
export const audienceSchema = z.enum(['contacts', 'followers'])
export type Audience = z.infer<typeof audienceSchema>
export const audiences: Audience[] = audienceSchema.options

export const timeWindowSchema = z.enum(['7d', '30d', '90d', '6m', '1y', 'all'])
export type TimeWindow = z.infer<typeof timeWindowSchema>

const rate = z.number().nullable()

export const openToWorkSummarySchema = z.object({
  open: z.number(),
  notOpen: z.number(),
  uncertain: z.number(),
  rate,
  matchedRate: rate,
  matchedCount: z.number(),
  sevenDayChangePp: rate,
  added: z.number(),
  removed: z.number(),
  net: z.number(),
  entryRate: rate,
  removalRate: rate,
  entryExitRatio: rate,
  hasComparablePrior: z.boolean(),
})
export type OpenToWorkSummary = z.infer<typeof openToWorkSummarySchema>

export const hiringSummarySchema = z.object({
  hiring: z.number(),
  notHiring: z.number(),
  uncertain: z.number(),
  rate,
  added: z.number(),
  removed: z.number(),
  net: z.number(),
  companyCount: z.number(),
  hasComparablePrior: z.boolean(),
})
export type HiringSummary = z.infer<typeof hiringSummarySchema>

export const scanSummarySchema = z.object({
  id: z.string(),
  scanDate: z.string(),
  screenshotCount: z.number(),
  peopleCount: z.number(),
  duplicateCount: z.number(),
  openToWork: openToWorkSummarySchema,
  hiring: hiringSummarySchema,
})
export type ScanSummary = z.infer<typeof scanSummarySchema>

const confidenceBreakdownSchema = z.object({
  highConfidence: z.number(),
  lowConfidence: z.number(),
  uncertain: z.number(),
})
export type ConfidenceBreakdown = z.infer<typeof confidenceBreakdownSchema>

export const scanQualitySchema = z.object({
  screenshotCount: z.number(),
  cardsDetected: z.number(),
  uniquePeople: z.number(),
  duplicateCount: z.number(),
  openToWork: confidenceBreakdownSchema,
  hiring: confidenceBreakdownSchema,
  classificationCoverage: rate,
  companyExtraction: z.object({
    identified: z.number(),
    lowConfidence: z.number(),
    notVisible: z.number(),
  }),
})
export type ScanQuality = z.infer<typeof scanQualitySchema>

export const screenshotResultSchema = z.object({
  fileName: z.string(),
  peopleDetected: z.number(),
  uncertainCount: z.number(),
  outcome: z.enum(['processed', 'warning', 'failed']),
  warning: z.string().nullable(),
})
export type ScreenshotResult = z.infer<typeof screenshotResultSchema>

export const hiringPersonSchema = z.object({
  personId: z.string(),
  displayName: z.string(),
  headline: z.string().nullable(),
  companyName: z.string().nullable(),
  companyNeedsReview: z.boolean(),
  firstSeenHiring: z.string(),
  lastSeenHiring: z.string(),
  lastSeen: z.string(),
  daysObservedHiring: z.number(),
  isCurrentlyHiring: z.boolean(),
  wasObservedInLatestScan: z.boolean(),
})
export type HiringPerson = z.infer<typeof hiringPersonSchema>

export const dashboardSchema = z.object({
  scanCount: z.number(),
  latestScan: scanSummarySchema.nullable(),
  latestQuality: scanQualitySchema.nullable(),
  whoIsHiring: z.object({
    peopleCount: z.number(),
    companyCount: z.number(),
    preview: z.array(hiringPersonSchema),
  }),
})
export type Dashboard = z.infer<typeof dashboardSchema>

export const scanHistorySchema = z.object({ scans: z.array(scanSummarySchema) })
export type ScanHistory = z.infer<typeof scanHistorySchema>

export const scanDetailSchema = z.object({
  summary: scanSummarySchema,
  quality: scanQualitySchema,
  screenshots: z.array(screenshotResultSchema),
})
export type ScanDetail = z.infer<typeof scanDetailSchema>

export const trendPointSchema = z.object({
  scanDate: z.string(),
  openRate: rate,
  openRateSevenDayAverage: rate,
  matchedOpenRate: rate,
  addedOpen: z.number(),
  removedOpen: z.number(),
  netOpen: z.number(),
  entryRate: rate,
  removalRate: rate,
  hiringRate: rate,
  addedHiring: z.number(),
  removedHiring: z.number(),
  netHiring: z.number(),
})
export type TrendPoint = z.infer<typeof trendPointSchema>

export const movingAverageSchema = z.object({
  label: z.string(),
  rate,
  changePp: rate,
})
export type MovingAverage = z.infer<typeof movingAverageSchema>

export const durationDistributionSchema = z.object({
  completedEpisodes: z.number(),
  medianDays: rate,
  buckets: z.array(z.object({ label: z.string(), share: z.number() })),
})
export type DurationDistribution = z.infer<typeof durationDistributionSchema>

export const trendsSchema = z.object({
  points: z.array(trendPointSchema),
  movingAverages: z.array(movingAverageSchema),
  flowTotals: z.object({
    addedOpen: z.number(),
    removedOpen: z.number(),
    entryExitRatio: rate,
  }),
  durations: durationDistributionSchema,
})
export type Trends = z.infer<typeof trendsSchema>

export const hiringStatusFilterSchema = z.enum(['current', 'previous', 'all'])
export type HiringStatusFilter = z.infer<typeof hiringStatusFilterSchema>

export const companyKnownFilterSchema = z.enum(['known', 'unknown', 'all'])
export type CompanyKnownFilter = z.infer<typeof companyKnownFilterSchema>

export const hiringSortSchema = z.enum(['lastSeen', 'firstSeen', 'duration', 'name'])
export type HiringSort = z.infer<typeof hiringSortSchema>

export const hiringPeopleQuerySchema = z.object({
  search: z.string().default(''),
  company: z.string().default(''),
  status: hiringStatusFilterSchema.default('current'),
  companyKnown: companyKnownFilterSchema.default('all'),
  sort: hiringSortSchema.default('lastSeen'),
})
export type HiringPeopleQuery = z.infer<typeof hiringPeopleQuerySchema>

export const hiringPeopleSchema = z.object({ people: z.array(hiringPersonSchema) })

export const companyHiringSchema = z.object({
  companies: z.array(z.object({ companyName: z.string(), peopleCount: z.number() })),
  notVisibleCount: z.number(),
  needsReviewCount: z.number(),
})
export type CompanyHiring = z.infer<typeof companyHiringSchema>

export const settingsSchema = z.object({
  inboxDirectory: z.string().min(1),
  archiveDirectory: z.string().min(1),
  automaticProcessing: z.boolean(),
  openToWorkThresholds: z.object({ open: z.number().min(0).max(1), notOpen: z.number().min(0).max(1) }),
  hiringThresholds: z.object({ hiring: z.number().min(0).max(1), notHiring: z.number().min(0).max(1) }),
  visionFallback: z.boolean(),
  scanFrequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']),
  retention: z.enum(['forever', '1y', '90d']),
})
export type Settings = z.infer<typeof settingsSchema>

export const processingResultSchema = z.object({ message: z.string() })
export type ProcessingResult = z.infer<typeof processingResultSchema>

export const addScreenshotsRequestSchema = z.object({
  files: z
    .array(z.object({ fileName: z.string().min(1).max(255), dataBase64: z.string().min(1) }))
    .min(1)
    .max(100),
})
export type AddScreenshotsRequest = z.infer<typeof addScreenshotsRequestSchema>

export const addScreenshotsResultSchema = z.object({
  saved: z.array(z.string()),
  rejected: z.array(z.object({ fileName: z.string(), reason: z.string() })),
  message: z.string(),
})
export type AddScreenshotsResult = z.infer<typeof addScreenshotsResultSchema>

export const departedPersonSchema = z.object({
  personId: z.string(),
  displayName: z.string(),
  headline: z.string().nullable(),
  companyName: z.string().nullable(),
  firstSeen: z.string(),
  lastSeen: z.string(),
  scansMissed: z.number(),
  wasOpenToWorkWhenLastSeen: z.boolean(),
  wasHiringWhenLastSeen: z.boolean(),
})
export type DepartedPerson = z.infer<typeof departedPersonSchema>

export const departedPeopleSchema = z.object({
  people: z.array(departedPersonSchema),
  scansMissedThreshold: z.number(),
})
export type DepartedPeople = z.infer<typeof departedPeopleSchema>
