'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface ColumnWidthConfig {
  [key: string]: number; // width in pixels
}

export function useResizableColumns(
  tableKey: string,
  initialWidths: ColumnWidthConfig
) {
  const [widths, setWidths] = useState<ColumnWidthConfig>(initialWidths);
  const activeResizer = useRef<{
    colKey: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  // Load saved widths from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`ez-col-widths-${tableKey}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setWidths((prev) => ({ ...prev, ...parsed }));
      }
    } catch (e) {
      // Fallback to initial
    }
  }, [tableKey]);

  // Save widths
  const saveWidths = useCallback(
    (newWidths: ColumnWidthConfig) => {
      try {
        localStorage.setItem(
          `ez-col-widths-${tableKey}`,
          JSON.stringify(newWidths)
        );
      } catch (e) {}
    },
    [tableKey]
  );

  const startResizing = useCallback(
    (colKey: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      activeResizer.current = {
        colKey,
        startX: e.clientX,
        startWidth: widths[colKey] || initialWidths[colKey] || 150,
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!activeResizer.current) return;
        const delta = moveEvent.clientX - activeResizer.current.startX;
        const minWidth = 80;
        const newWidth = Math.max(minWidth, activeResizer.current.startWidth + delta);

        setWidths((prev) => {
          const updated = {
            ...prev,
            [activeResizer.current!.colKey]: newWidth,
          };
          return updated;
        });
      };

      const handleMouseUp = () => {
        if (activeResizer.current) {
          setWidths((latest) => {
            saveWidths(latest);
            return latest;
          });
        }
        activeResizer.current = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [widths, initialWidths, saveWidths]
  );

  const resetWidths = useCallback(() => {
    setWidths(initialWidths);
    try {
      localStorage.removeItem(`ez-col-widths-${tableKey}`);
    } catch (e) {}
  }, [initialWidths, tableKey]);

  return {
    widths,
    startResizing,
    resetWidths,
  };
}
