'use client';

import { 
  ReactFlow, 
  Controls, 
  useNodesState, 
  useEdgesState,
  NodeTypes,
  Background,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { MemoryNode } from './MemoryNode';
import { ImageNode } from './ImageNode';
import { MultiImageNode } from './MultiImageNode';

const nodeTypes: NodeTypes = {
  'memory-node': MemoryNode,
  'image-node': ImageNode,
  'multi-image-node': MultiImageNode,
};

const initialNodes = [
  {
    id: '1',
    type: 'memory-node',
    position: { x: 250, y: 250 },
    data: { label: 'Welcome', content: 'Welcome to your new memory space. Hi Welcome to your new memory space. Welcome to your new memory space. Welcome to your new memory space. Welcome to your new memory space. Welcome to your new memory space. Welcome to your new memory space. Welcome to your new memory space. Welcome to your new memory space. ' },
  },
  {
    id: '2',
    type: 'memory-node',
    position: { x: 600, y: 100 },
    data: { label: 'Getting Started', content: 'Double click anywhere to create a new node (coming soon).' },
  },
  {
    id: '3',
    type: 'image-node',
    position: { x: 400, y: 400 },
    data: { src: '/bill-gates-young.jpg', alt: 'Bill Gates Memory' },
  },
  {
    id: '4',
    type: 'multi-image-node',
    position: { x: 700, y: 300 },
    data: {
      images: [
        '/bill-gates-young.jpg',
        '/steve jobs.png',
        '/bill-gates-young.jpg'
      ]
    },
  },
];

export function InfiniteCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  return (
    <div className="h-full w-full bg-[#F0F0F0]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#F0F0F0" gap={16} />
        <Controls className="bg-white border border-gray-200 shadow-sm" />
      </ReactFlow>
    </div>
  );
}
