import { NodeProps, Node } from '@xyflow/react';
import { ImageStack } from '@/components/ui/ImageStack';

export type MultiImageNodeData = {
  images: string[];
  width?: number;
  height?: number;
};

export type MultiImageNode = Node<MultiImageNodeData, 'multi-image-node'>;

export function MultiImageNode({ data }: NodeProps<MultiImageNode>) {
  return (
    <ImageStack 
      images={data.images} 
      width={data.width} 
      height={data.height} 
    />
  );
}
