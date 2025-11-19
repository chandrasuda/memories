import { NodeProps, Node } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { ImageComponent } from '@/components/ui/images';

export type LinkNodeData = {
  label?: string;
  content?: string; // This will store the description
  url?: string; // This will store the actual URL
  images?: string[];
};

export type LinkNode = Node<LinkNodeData, 'link-node'>;

export function LinkNode({ data }: NodeProps<LinkNode>) {
  const hasImage = data.images && data.images.length > 0;
  const imageUrl = hasImage ? data.images![0] : null;

  return (
    <div
      className={cn(
        "relative flex flex-col bg-[#242424] rounded-2xl overflow-hidden transition-all duration-200 drop-shadow-xl group",
        "w-[300px]"
      )}
    >
      {/* Image Section - Full width top */}
      {imageUrl && (
        <div className="w-full relative aspect-[1.91/1] bg-gray-100">
          <img
            src={imageUrl}
            alt={data.label || "Link preview"}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Content Section - Bottom */}
      <div className="p-4 flex flex-col gap-1 bg-[#242424]">
        {/* Title */}
        <div className="font-semibold text-[15px] text-white leading-tight line-clamp-2">
          {data.label || "Untitled Link"}
        </div>
        
        {/* Domain/Subtitle */}
        <div className="text-[13px] text-gray-400 leading-snug truncate">
          {data.url ? new URL(data.url).hostname : "link"}
        </div>
      </div>
      
      {/* Hover overlay to indicate clickability */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none" />
    </div>
  );
}

