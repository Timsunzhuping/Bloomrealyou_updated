'use client';

import * as React from 'react';

import { cn } from '../lib/cn';

export interface ImagePreviewItem {
  src: string;
  alt: string;
}

export interface ImagePreviewProps {
  images: ImagePreviewItem[];
  /** Initial index. */
  defaultIndex?: number;
  className?: string;
  /** aria-label for the thumbnail list. */
  thumbnailListLabel?: string;
}

export function ImagePreview({
  images,
  defaultIndex = 0,
  className,
  thumbnailListLabel,
}: ImagePreviewProps): JSX.Element {
  const [index, setIndex] = React.useState(defaultIndex);
  const safeIndex = Math.min(Math.max(0, index), Math.max(images.length - 1, 0));
  const current = images[safeIndex];

  return (
    <div className={cn('grid gap-3', className)}>
      <div className="aspect-square overflow-hidden rounded-lg border bg-muted">
        {current ? (
          <img src={current.src} alt={current.alt} className="h-full w-full object-cover" />
        ) : null}
      </div>
      {images.length > 1 && (
        <ul aria-label={thumbnailListLabel} className="flex flex-wrap gap-2">
          {images.map((img, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-current={i === safeIndex ? 'true' : undefined}
                className={cn(
                  'h-16 w-16 overflow-hidden rounded-md border bg-muted transition-all',
                  i === safeIndex ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'hover:opacity-80',
                )}
              >
                <img src={img.src} alt={img.alt} className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
