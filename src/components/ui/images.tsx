import { cn } from '@/lib/utils';

interface ImageProps {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
}

export function ImageComponent({
  src,
  alt = '',
  width,
  height,
  className
}: ImageProps) {
  return (
    <div className={cn("relative inline-block", className)}>
      <div className="rounded-xl border border-white bg-white p-0.5">
        <img
          src={src}
          alt={alt}
          width={width || 300}
          height={height || 225}
          className="rounded-xl object-contain"
          style={{ aspectRatio: 'auto' }}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
}
