'use client';

import { Upload } from 'lucide-react';
import * as React from 'react';

import { cn } from '../lib/cn';

export interface FileUploaderProps {
  /** MIME type filter, e.g. "image/*" */
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
  /** All visible copy is supplied by the caller for i18n compliance. */
  labels: {
    /** Visible call-to-action heading. */
    title: string;
    /** Sub-text explaining accepted file types / size. */
    description: string;
    /** Button label inside the dropzone. */
    browse: string;
    /** aria-label for the hidden file input. */
    inputAriaLabel: string;
  };
  className?: string;
}

export function FileUploader({
  accept,
  multiple,
  disabled,
  onFiles,
  labels,
  className,
}: FileUploaderProps): JSX.Element {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  function emit(list: FileList | null): void {
    if (!list || list.length === 0) return;
    onFiles(Array.from(list));
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (disabled) return;
        emit(e.dataTransfer.files);
      }}
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 px-6 py-10 text-center transition-colors',
        isDragging && 'border-primary bg-primary/5',
        disabled && 'opacity-50',
        className,
      )}
    >
      <Upload className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      <h3 className="text-sm font-semibold">{labels.title}</h3>
      <p className="max-w-md text-xs text-muted-foreground">{labels.description}</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="mt-2 inline-flex h-9 items-center justify-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
      >
        {labels.browse}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        aria-label={labels.inputAriaLabel}
        className="sr-only"
        onChange={(e) => emit(e.target.files)}
      />
    </div>
  );
}
