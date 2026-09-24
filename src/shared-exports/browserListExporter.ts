import type { ExportFormat, ListExport, ListExporter } from './listExport'

export const browserListExporter: ListExporter = {
  save: async (listExport) => downloadFile(await fileWriters[listExport.format](listExport), listExport.fileName),
}

const fileWriters: Record<ExportFormat, (listExport: ListExport) => Promise<Blob>> = {
  xlsx: writeSpreadsheet,
  pdf: writePdf,
  csv: async ({ columns, rows }) => new Blob(['﻿', [columns, ...rows].map(toCsvLine).join('\r\n')], { type: 'text/csv;charset=utf-8' }),
}

const wideColumns: Record<string, number> = { Name: 28, Person: 28, Headline: 60, 'Title / headline': 60, Company: 28 }

async function writeSpreadsheet({ columns, rows }: ListExport): Promise<Blob> {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const header = columns.map((column) => ({ value: column, fontWeight: 'bold' as const }))
  return writeXlsxFile([header, ...rows], {
    sheet: 'People',
    stickyRowsCount: 1,
    columns: columns.map((column) => ({ width: wideColumns[column] ?? 16 })),
  }).toBlob()
}

async function writePdf({ title, columns, rows }: ListExport): Promise<Blob> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  pdf.setFontSize(14)
  pdf.text(title, 40, 40)
  const headlineColumn = columns.findIndex((column) => (wideColumns[column] ?? 0) > 50)
  autoTable(pdf, {
    head: [columns],
    body: rows,
    startY: 56,
    margin: { left: 40, right: 40 },
    styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
    headStyles: { fillColor: [40, 40, 40] },
    columnStyles: headlineColumn >= 0 ? { [headlineColumn]: { cellWidth: 240 } } : {},
  })
  return pdf.output('blob')
}

function toCsvLine(cells: string[]): string {
  return cells.map((cell) => (/[",\r\n]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell)).join(',')
}

function downloadFile(file: Blob, fileName: string): void {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
