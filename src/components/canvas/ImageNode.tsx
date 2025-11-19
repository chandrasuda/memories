import { NodeProps, Node } from '@xyflow/react';
import { ImageComponent } from '@/components/ui/images';

export type ImageNodeData = {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
};

export type ImageNode = Node<ImageNodeData, 'image-node'>;

export function ImageNode({ data, selected }: NodeProps<ImageNode>) {
  return (
    <div className="relative">
      <ImageComponent
        src={data.src}
        alt={data.alt || 'Memory image'}
        width={data.width}
        height={data.height}
      />
    </div>
  );
}
