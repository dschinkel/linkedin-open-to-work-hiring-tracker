import { type AddScreenshotsRequest, type AddScreenshotsResult, addScreenshotsRequestSchema, type ProcessingResult } from '../../../contracts/api.ts'
import { type ApiRequest, type ApiResponse, ok, orNotFound } from '../../app/HttpRouting.ts'

export interface ScreenshotUseCases {
  addScreenshots: (request: AddScreenshotsRequest) => Promise<AddScreenshotsResult>
  reprocessScan: (scanId: string) => Promise<ProcessingResult | null>
}

/** Inbound adapter for adding screenshots and re-reading a scan. */
export const screenshotsHttp = (useCases: ScreenshotUseCases) => ({
  addScreenshots: async (request: ApiRequest): Promise<ApiResponse> => ok(await useCases.addScreenshots(addScreenshotsRequestSchema.parse(request.body))),
  reprocessScan: async (_request: ApiRequest, [scanId]: string[]): Promise<ApiResponse> => orNotFound(await useCases.reprocessScan(scanId)),
})

export type ScreenshotsHttp = ReturnType<typeof screenshotsHttp>
