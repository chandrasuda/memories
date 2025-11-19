import { useStore, useViewport, ReactFlowState } from '@xyflow/react';
import { useMemo } from 'react';

interface SeamlessBackgroundProps {
  src: string;
  color?: string;
  className?: string;
}

// We'll use a fixed size for the base tile pattern
// This determines how "zoomed in" the background texture appears
const TILE_SIZE = 1000; 

export function SeamlessBackground({ src, color, className }: SeamlessBackgroundProps) {
  const { x, y, zoom } = useViewport();

  // Create the pattern transform based on viewport
  const patternTransform = `translate(${x},${y}) scale(${zoom})`;

  return (
    <div className={`absolute inset-0 -z-10 h-full w-full pointer-events-none ${className || ''}`} style={{ backgroundColor: color }}>
      <svg className="h-full w-full">
        <defs>
          {/* Base Image Definition */}
          <image id="bg-img" href={src} width={TILE_SIZE} height={TILE_SIZE} preserveAspectRatio="none" />
          
          {/* 
            2x2 Mirrored Pattern 
            This creates a seamless tile by flipping the image in 4 quadrants:
            TL: Normal
            TR: Flipped Horizontal
            BL: Flipped Vertical
            BR: Flipped Horizontal & Vertical
          */}
          <pattern
            id="seamless-pattern"
            x="0"
            y="0"
            width={TILE_SIZE * 2}
            height={TILE_SIZE * 2}
            patternUnits="userSpaceOnUse"
            patternTransform={patternTransform}
          >
            {/* Top Left - Normal */}
            <use href="#bg-img" x="0" y="0" />
            
            {/* Top Right - Flipped X */}
            <g transform={`translate(${TILE_SIZE * 2}, 0) scale(-1, 1)`}>
              <use href="#bg-img" x="0" y="0" />
            </g>
            
            {/* Bottom Left - Flipped Y */}
            <g transform={`translate(0, ${TILE_SIZE * 2}) scale(1, -1)`}>
              <use href="#bg-img" x="0" y="0" />
            </g>
            
            {/* Bottom Right - Flipped X & Y */}
            <g transform={`translate(${TILE_SIZE * 2}, ${TILE_SIZE * 2}) scale(-1, -1)`}>
              <use href="#bg-img" x="0" y="0" />
            </g>
          </pattern>
        </defs>
        
        <rect width="100%" height="100%" fill="url(#seamless-pattern)" />
      </svg>
    </div>
  );
}

