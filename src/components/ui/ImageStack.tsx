import { useState } from 'react';
import { ImageComponent } from './images';

interface ImageStackProps {
  images: string[];
  width?: number;
  height?: number;
}

export function ImageStack({ 
  images, 
  width = 250, 
  height = 250 
}: ImageStackProps) {
  const [imageOrder, setImageOrder] = useState(() => 
    (images || []).map((src, index) => ({ src, originalIndex: index }))
  );

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent node selection/drag if needed
    setImageOrder(prev => {
      const newOrder = [...prev];
      const first = newOrder.shift();
      if (first) newOrder.push(first);
      return newOrder;
    });
  };

  const getStyle = (index: number) => {
    // Bottom card - rotated left
    if (index === 0) {
      return {
        transform: 'rotate(-12deg) translate(-20px, 10px)',
        zIndex: 1
      };
    }
    // Middle card - rotated right
    if (index === 1) {
      return {
        transform: 'rotate(8deg) translate(15px, 5px)',
        zIndex: 2
      };
    }
    // Top card - slight rotation
    if (index === 2) {
      return {
        transform: 'rotate(-2deg) translate(0px, -5px)',
        zIndex: 3
      };
    }
    return { zIndex: index };
  };

  return (
    <div 
      className="relative cursor-pointer group" 
      style={{ width, height }}
      onClick={handleClick}
    >
      {imageOrder.map((item, index) => (
        <div
          key={item.originalIndex}
          className="absolute top-0 left-0 transition-all duration-500 ease-in-out drop-shadow-xl will-change-transform"
          style={getStyle(index)}
        >
          <ImageComponent
            src={item.src}
            width={width}
            height={height}
            className="shadow-sm group-hover:scale-[1.02] transition-transform duration-300"
          />
        </div>
      ))}
    </div>
  );
}

