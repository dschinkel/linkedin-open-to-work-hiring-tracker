import type { PDFPageProxy } from 'pdfjs-dist'

export interface PdfReader {
  open: (pdf: File) => Promise<PdfDocument>
}

export interface PdfDocument {
  pageCount: number
  renderPage: (pageNumber: number) => Promise<Blob>
}

const minimumScale = 2
const largestCanvasSide = 16_384
const largestCanvasArea = 120_000_000

export const browserPdfReader: PdfReader = {
  open: async (pdf) => {
    const pdfjs = await loadPdfjs()
    const loaded = await pdfjs.getDocument({ data: new Uint8Array(await pdf.arrayBuffer()) }).promise
    return {
      pageCount: loaded.numPages,
      renderPage: async (pageNumber) => {
        const page = await loaded.getPage(pageNumber)
        try {
          return await drawAsPng(page, await sharpScaleFor(page, pdfjs.OPS.paintImageXObject))
        } finally {
          page.cleanup()
        }
      },
    }
  },
}

async function loadPdfjs() {
  const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')])
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  return pdfjs
}

async function sharpScaleFor(page: PDFPageProxy, paintImageOperation: number): Promise<number> {
  const { width, height } = page.getViewport({ scale: 1 })
  const operations = await page.getOperatorList()
  const widestPicture = Math.max(0, ...operations.fnArray.flatMap((operation, index) => (operation === paintImageOperation ? [Number(operations.argsArray[index][1]) || 0] : [])))
  const wanted = Math.max(minimumScale, widestPicture / width)
  return Math.min(wanted, largestCanvasSide / width, largestCanvasSide / height, Math.sqrt(largestCanvasArea / (width * height)))
}

async function drawAsPng(page: PDFPageProxy, scale: number): Promise<Blob> {
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  await page.render({ canvas, viewport }).promise
  const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  canvas.width = 0
  canvas.height = 0
  if (!png) throw new Error('the page could not be drawn')
  return png
}
