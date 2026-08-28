'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface ResizableThProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  colKey: string;
  width?: number;
  onResizeStart?: (colKey: string, e: React.MouseEvent) => void;
  isResizable?: boolean;
}

export function ResizableTh({
  colKey,
  width,
  onResizeStart,
  isResizable = true,
  className,
  children,
  style,
  ...props
}: ResizableThProps) {
  return (
    <th
      scope="col"
      {...props}
      style={{
        ...style,
        width: width ? `${width}px` : style?.width,
        minWidth: width ? `${width}px` : style?.minWidth,
        maxWidth: width ? `${width}px` : style?.maxWidth,
      }}
      className={cn('relative select-none group', className)}
    >
      <div className="flex items-center justify-between w-full h-full">
        <div className="truncate flex items-center gap-1.5 min-w-0">{children}</div>
        {isResizable && onResizeStart && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label={`Resize ${colKey} column`}
            onMouseDown={(e) => onResizeStart(colKey, e)}
            onClick={(e) => e.stopPropagation()}
            title="Drag to resize column"
            className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-blue-500/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
          >
            <div className="w-[1.5px] h-3.5 bg-zinc-500 group-hover:bg-blue-400" />
          </div>
        )}
      </div>
    </th>
  );
}
