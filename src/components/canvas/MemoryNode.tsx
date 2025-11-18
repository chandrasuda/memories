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
        "relative min-w-[200px] max-w-[400px] rounded-xl border bg-white p-4 shadow-sm transition-all duration-200",
        selected ? "border-black shadow-md ring-1 ring-black" : "border-gray-200 hover:border-gray-300"
      )}
    >
      <div className="flex flex-col gap-2">
        {data.label && (
          <div className="font-medium text-xs text-gray-500 uppercase tracking-wider mb-1">
            {data.label}
          </div>
        )}
        <div className="text-gray-900 whitespace-pre-wrap font-sans leading-relaxed">
          {data.content || "Empty memory..."}
        </div>
      </div>
    </div>
  );
}

