import { NodeProps, Node } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { ImageStack } from '@/components/ui/ImageStack';
import { ImageComponent } from '@/components/ui/images';

export type MemoryNodeData = {
  label?: string;
  content?: string;
  type?: 'text' | 'image' | 'video' | 'mixed';
  images?: string[];
};

export type MemoryNode = Node<MemoryNodeData, 'memory-node'>;

export function MemoryNode({ data }: NodeProps<MemoryNode>) {
  const hasImages = data.images && data.images.length > 0;
  const isMultiImage = data.images && data.images.length > 1;

  return (
    <div
      className={cn(
        "relative flex flex-col bg-white rounded-2xl p-5 transition-all duration-200 drop-shadow-xl",
        "w-[290px] h-[200px]"
      )}
    >
      <div className="flex flex-col gap-3 h-full">
        {/* Title */}
        {data.label && (
          <div className="font-semibold text-[14px] text-black leading-tight shrink-0">
            {data.label}
          </div>
        )}
        
        <div className="flex flex-1 gap-5 min-h-0">
          {/* Image Section (Left) */}
          {hasImages && (
            <div className="w-[100px] shrink-0 flex items-center justify-center">
              {isMultiImage ? (
                <div className="scale-75 origin-center">
                   <ImageStack images={data.images!} width={120} height={120} />
                </div>
              ) : (
                <ImageComponent 
                  src={data.images![0]} 
                  width={100} 
                  height={100} 
                  className="shadow-md"
                />
              )}
            </div>
          )}

          {/* Content Section (Right or Full) */}
          <div className="relative flex-1 min-h-0">
            <div 
              className="text-black font-semibold text-[11px] leading-relaxed whitespace-pre-wrap h-full overflow-hidden wrap-break-word"
              dangerouslySetInnerHTML={{ 
                __html: (data.content || "Empty memory...")
                  .replace(/<img[^>]*>/g, '') // Remove images from content preview
                  .replace(/<[^>]+>/g, '') // Remove other HTML tags for plain text preview
              }} 
            />
            
            {/* Gradient Fade */}
            <div className="absolute bottom-0 left-0 w-full h-8 bg-linear-to-t from-white via-white/80 to-transparent pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}
