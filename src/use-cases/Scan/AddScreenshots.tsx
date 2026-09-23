import { ImageUp, LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAddScreenshots } from './useAddScreenshots'

export function AddScreenshots() {
  const drop = useAddScreenshots()

  return (
    <label
      htmlFor="add-screenshots"
      onDragOver={drop.handleDragOver}
      onDragLeave={drop.handleDragLeave}
      onDrop={drop.handleDrop}
      className={cn(
        'flex cursor-pointer flex-col items-center gap-2 border border-dashed border-input p-6 text-center transition-colors hover:border-prompt hover:bg-card',
        drop.isDraggingOver && 'border-solid border-open-to-work bg-open-to-work-soft',
      )}
    >
      <ImageUp className="size-8 text-prompt" />
      <span className="font-medium text-primary">Drag LinkedIn screenshots here, or click to choose files</span>
      <span className="max-w-measure text-label text-muted-foreground">PNG, JPG, WebP, or PDF (each PDF page counts as one screenshot). They are analyzed as soon as they land, and this dashboard updates by itself. Files already added are skipped.</span>
      <input id="add-screenshots" type="file" multiple accept={drop.acceptedTypes} className="sr-only" onChange={drop.handleFilesChosen} />
      {drop.isUploading && (
        <span className="upload-progress inline-flex items-center gap-2 text-sm font-semibold" role="status">
          <LoaderCircle className="size-4 animate-spin" />
          {drop.progressMessage}
        </span>
      )}
      {drop.resultMessage && <span className="text-sm font-medium">{drop.resultMessage}</span>}
      <ul className="text-xs text-muted-foreground">
        {drop.skippedFiles.map((skipped) => (
          <li key={skipped}>{skipped}</li>
        ))}
      </ul>
    </label>
  )
}
