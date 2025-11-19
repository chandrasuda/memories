import { NodeProps, Node } from '@xyflow/react';
import { cn } from '@/lib/utils';

export type MemoryNodeData = {
  label?: string;
  content?: string;
  type?: 'text' | 'image' | 'video' | 'mixed';
};

export type MemoryNode = Node<MemoryNodeData, 'memory-node'>;

export function MemoryNode({ data, selected }: NodeProps<MemoryNode>) {
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
        
        {/* Content */}
        <div className="relative flex-1 min-h-0">
          <div className="text-black font-semibold text-[11px] leading-relaxed whitespace-pre-wrap h-full overflow-hidden">
            {data.content || "Empty memory..."}
          </div>
          
          {/* Gradient Fade */}
          <div className="absolute bottom-0 left-0 w-full h-5 bg-linear-to-t from-white to-transparent pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
