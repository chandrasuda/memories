import { Node, NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';

export type ClusterNodeData = {
  label: string;
  count?: number;
};

export type ClusterNode = Node<ClusterNodeData, 'cluster-node'>;

export function ClusterNode({ data }: NodeProps<ClusterNode>) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full px-6 py-3 shadow-lg border',
        'bg-black text-white border-white/40 text-xs font-semibold whitespace-nowrap'
      )}
    >
      <span>{data.label}</span>
      {typeof data.count === 'number' && (
        <span className="ml-2 text-[10px] opacity-70">({data.count})</span>
      )}
    </div>
  );
}


