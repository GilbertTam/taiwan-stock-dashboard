'use client';

import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { Box } from '@mui/material';

interface ResizableLayoutProps {
  direction?: 'vertical' | 'horizontal';
  children: ReactNode[];
  defaultSizes?: number[];
  minSizes?: number[];
  onResize?: (sizes: number[]) => void;
  storageKey?: string;
}

export const ResizableLayout: React.FC<ResizableLayoutProps> = ({
  direction = 'vertical',
  children,
  defaultSizes = [70, 30],
  minSizes = [30, 20],
  onResize,
  storageKey
}) => {
  const [sizes, setSizes] = useState<number[]>(() => {
    if (storageKey && typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return defaultSizes;
        }
      }
    }
    return defaultSizes;
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startPosRef = useRef(0);
  const startSizesRef = useRef<number[]>([]);
  const rafIdRef = useRef<number | null>(null);
  const pendingSizesRef = useRef<number[] | null>(null);

  useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(sizes));
    }
    if (onResize) {
      onResize(sizes);
    }
  }, [sizes, storageKey, onResize]);

  const handleMouseDown = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    startPosRef.current = direction === 'vertical' ? e.clientY : e.clientX;
    startSizesRef.current = [...sizes];
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const flushPendingSizes = () => {
    rafIdRef.current = null;
    if (pendingSizesRef.current) {
      setSizes(pendingSizesRef.current);
      pendingSizesRef.current = null;
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const containerSize = direction === 'vertical' ? containerRect.height : containerRect.width;
    const currentPos = direction === 'vertical' ? e.clientY : e.clientX;
    const delta = currentPos - startPosRef.current;
    const deltaPercent = (delta / containerSize) * 100;

    const newSizes = [...startSizesRef.current];
    const totalSize = newSizes.reduce((sum, size) => sum + size, 0);
    
    const panelIndex = Math.floor((currentPos - (direction === 'vertical' ? containerRect.top : containerRect.left)) / containerSize * newSizes.length);
    const actualIndex = Math.max(0, Math.min(panelIndex, newSizes.length - 2));

    if (actualIndex >= 0 && actualIndex < newSizes.length - 1) {
      const newSize1 = Math.max(
        minSizes[actualIndex] || 10,
        Math.min(90, newSizes[actualIndex] + deltaPercent)
      );
      const newSize2 = Math.max(
        minSizes[actualIndex + 1] || 10,
        Math.min(90, newSizes[actualIndex + 1] - deltaPercent)
      );

      if (newSize1 >= (minSizes[actualIndex] || 10) && newSize2 >= (minSizes[actualIndex + 1] || 10)) {
        newSizes[actualIndex] = newSize1;
        newSizes[actualIndex + 1] = newSize2;
        pendingSizesRef.current = newSizes;
        if (rafIdRef.current === null) {
          rafIdRef.current = requestAnimationFrame(flushPendingSizes);
        }
      }
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    flushPendingSizes();
  };

  const normalizedSizes = sizes.length === children.length 
    ? sizes 
    : [...sizes, ...Array(children.length - sizes.length).fill(100 / children.length)];

  const totalSize = normalizedSizes.reduce((sum, size) => sum + size, 0);
  const normalizedPercentages = normalizedSizes.map(size => (size / totalSize) * 100);

  return (
    <Box
      ref={containerRef}
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: direction === 'vertical' ? 'column' : 'row',
        position: 'relative',
      }}
    >
      {children.map((child, index) => (
        <React.Fragment key={index}>
          <Box
            sx={{
              flex: `0 0 ${normalizedPercentages[index]}%`,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {child}
          </Box>
          {index < children.length - 1 && (
            <Box
              onMouseDown={(e) => handleMouseDown(index, e)}
              sx={{
                flex: '0 0 4px',
                cursor: direction === 'vertical' ? 'row-resize' : 'col-resize',
                backgroundColor: 'var(--card-border)',
                position: 'relative',
                '&:hover': {
                  backgroundColor: 'var(--primary)',
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  ...(direction === 'vertical'
                    ? { top: '-2px', left: 0, right: 0, height: '4px' }
                    : { left: '-2px', top: 0, bottom: 0, width: '4px' }),
                },
                transition: 'background-color 0.2s',
              }}
            />
          )}
        </React.Fragment>
      ))}
    </Box>
  );
};
