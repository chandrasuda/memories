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
        "relative flex flex-col bg-white rounded-2xl p-5 transition-all duration-200",
        "min-w-[250px] max-w-[350px]"
      )}
    >
      <div className="flex flex-col gap-4">
        {/* Title */}
        {data.label && (
          <div className="font-semibold text-lg text-black leading-tight">
            {data.label}
          </div>
        )}
        
        {/* Content */}
        <div className="relative">
          <div className="text-gray-500 font-normal text-sm leading-relaxed whitespace-pre-wrap max-h-[250px] overflow-hidden">
            {data.content || "Empty memory..."}
          </div>
          
          {/* Gradient Fade */}
          <div className="absolute bottom-0 left-0 w-full h-12 bg-linear-to-t from-white to-transparent pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
