'use client';

import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  NodeTypes,
  Background,
  Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useState, useEffect } from 'react';

import { MemoryNode } from './MemoryNode';
import { ImageNode } from './ImageNode';
import { MultiImageNode } from './MultiImageNode';
import { ExpandedNodeOverlay } from './ExpandedNodeOverlay';
import { fetchMemories, Memory } from '@/lib/supabase';

const nodeTypes: NodeTypes = {
  'memory-node': MemoryNode,
  'image-node': ImageNode,
  'multi-image-node': MultiImageNode,
};

// Function to create nodes from memories
function createNodesFromMemories(memories: Memory[]): Node[] {
  return memories.map((memory, index) => {
    // Create a simple grid layout
    const cols = Math.ceil(Math.sqrt(memories.length));
    const row = Math.floor(index / cols);
    const col = index % cols;

    const x = 300 + (col * 350);
    const y = 200 + (row * 250);

    return {
      id: memory.id,
      type: 'memory-node',
      position: { x, y },
      data: {
        label: memory.title,
        content: memory.content,
        images: memory.assets || [],
        // Extract images from content if assets array is empty (fallback for old memories)
        // This handles the case where images might be embedded in HTML content
      },
    };
  });
}

export function InfiniteCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);

  // Fetch memories on component mount
  useEffect(() => {
    async function loadMemories() {
      try {
        const memories = await fetchMemories();
        const memoryNodes = createNodesFromMemories(memories);
        setNodes(memoryNodes);
      } catch (error) {
        console.error('Failed to load memories:', error);
      }
    }

    loadMemories();
  }, [setNodes]);

  const handleNodeDoubleClick = (event: React.MouseEvent, node: Node) => {
    setExpandedNodeId(node.id);
  };

  const expandedNode = nodes.find(n => n.id === expandedNodeId) || null;

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
        onNodeDoubleClick={handleNodeDoubleClick}
      >
        <Background color="#F0F0F0" gap={16} />
      </ReactFlow>

      <ExpandedNodeOverlay 
        node={expandedNode} 
        onClose={() => setExpandedNodeId(null)} 
      />
    </div>
  );
}
