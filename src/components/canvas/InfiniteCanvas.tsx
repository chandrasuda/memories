'use client';

import { 
  ReactFlow, 
  Controls, 
  useNodesState, 
  useEdgesState,
  NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { MemoryNode } from './MemoryNode';
import { ImageNode } from './ImageNode';
import { SeamlessBackground } from './SeamlessBackground';

const nodeTypes: NodeTypes = {
  'memory-node': MemoryNode,
  'image-node': ImageNode,
};

const initialNodes = [
  {
    id: '1',
    type: 'memory-node',
    position: { x: 250, y: 250 },
    data: { label: 'Welcome', content: 'Welcome to your new memory space. Welcome to your new memory space. Welcome to your new memory space. Welcome to your new memory space. Welcome to your new memory space. Welcome to your new memory space. Welcome to your new memory space. Welcome to your new memory space. Welcome to your new memory space. ' },
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
    data: { src: '/yosemite 1.png', alt: 'Yosemite Memory' },
  },
];

export function InfiniteCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  return (
    <div className="h-full w-full bg-[#FDDAC6]">
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
        <SeamlessBackground src="/memories_background.png" />
        <Controls className="bg-white border border-gray-200 shadow-sm" />
      </ReactFlow>
    </div>
  );
}

