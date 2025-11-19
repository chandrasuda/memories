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
import { useState, useEffect, useCallback } from 'react';

import { MemoryNode } from './MemoryNode';
import { ImageNode } from './ImageNode';
import { MultiImageNode } from './MultiImageNode';
import { LinkNode } from './LinkNode';
import { ExpandedNodeOverlay } from './ExpandedNodeOverlay';
import { fetchMemories, Memory, updateMemoryPosition } from '@/lib/supabase';

const nodeTypes: NodeTypes = {
  'memory-node': MemoryNode,
  'image-node': ImageNode,
  'multi-image-node': MultiImageNode,
  'link-node': LinkNode,
};

// Helper to check intersection between two rectangles with padding
function isColliding(
  r1: { x: number; y: number; w: number; h: number },
  r2: { x: number; y: number; w: number; h: number },
  padding: number
) {
  return (
    r1.x < r2.x + r2.w + padding &&
    r1.x + r1.w + padding > r2.x &&
    r1.y < r2.y + r2.h + padding &&
    r1.y + r1.h + padding > r2.y
  );
}

// Function to create nodes from memories with spiral layout
function createNodesFromMemories(memories: Memory[]): Node[] {
  const placedRects: { x: number; y: number; w: number; h: number }[] = [];
  const nodes: Node[] = [];

  // Center point
  const centerX = 0;
  const centerY = 0;

  // 1. Pre-process memories to determine dimensions and types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const processed = memories.map((memory) => {
    let type = 'memory-node';
    let width = 300; // Default width
    let height = 300; // Default height estimate

    if (memory.type === 'link') {
      type = 'link-node';
      height = 280; // Approx height for link node
    } else if (memory.type === 'image') {
      if (memory.assets && memory.assets.length > 1) {
        type = 'multi-image-node';
      } else {
        type = 'image-node';
      }
      height = 300;
    } else if (memory.content && memory.content.startsWith('http') && !memory.content.includes(' ') && memory.content.length < 500) {
      type = 'link-node';
      height = 280;
    } else if (memory.content && memory.content.indexOf('\n') !== -1 && memory.content.substring(0, memory.content.indexOf('\n')).startsWith('http')) {
      // Check if content matches the format "URL\nDescription" which we use for links
      type = 'link-node';
      height = 280;
    } else if (memory.assets && memory.assets.length > 0 && (!memory.content || memory.content.trim() === '')) {
      if (memory.assets.length > 1) {
        type = 'multi-image-node';
      } else {
        type = 'image-node';
      }
      height = 300;
    } else {
      // Memory node
      type = 'memory-node';
      width = 290;
      height = 200;
    }

    // Prepare data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = {
        label: memory.title,
        content: memory.content,
        images: memory.assets || [],
    };

    if (type === 'link-node') {
      const firstLineEnd = memory.content.indexOf('\n');
      if (firstLineEnd !== -1) {
        data.url = memory.content.substring(0, firstLineEnd);
        data.content = memory.content.substring(firstLineEnd + 1);
      } else {
        data.url = memory.content;
        data.content = '';
      }
    } else if (type === 'image-node') {
      data.src = memory.assets?.[0] || '';
      data.alt = memory.title;
      data.width = 300;
      data.height = 300;
    } else if (type === 'multi-image-node') {
      data.images = memory.assets || [];
    }

    return {
      ...memory,
      _type: type,
      _width: width,
      _height: height,
      _data: data
    };
  });

  // 2. Populate placedRects with existing fixed positions
  processed.forEach(m => {
    if (typeof m.x === 'number' && typeof m.y === 'number') {
      placedRects.push({ x: m.x, y: m.y, w: m._width, h: m._height });
    }
  });

  // 3. Place nodes
  processed.forEach((m) => {
    let x = m.x;
    let y = m.y;
    
    // If no position, find one using spiral
    if (x === undefined || y === undefined) {
        x = centerX;
        y = centerY;
        let angle = 0;
        
        if (placedRects.length > 0) {
            // Spiral parameters
            const a = 0;
            const b = 25; 
            
            let found = false;
            angle = 0.1; 
            
            while (!found) {
                const r = a + b * angle;
                const scale = 1 / Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle)));
                
                x = centerX + (r * Math.cos(angle)) * scale;
                y = centerY + (r * Math.sin(angle)) * scale;

                let collision = false;
                for (const rect of placedRects) {
                    if (isColliding({ x, y, w: m._width, h: m._height }, rect, 20)) {
                        collision = true;
                        break;
                    }
                }

                if (!collision) {
                    found = true;
                } else {
                    const step = Math.min(0.1, 10 / (r + 10)); 
                    angle += step;
                }
                
                if (angle > 2000) break; 
            }
        } else {
             x = centerX - m._width / 2;
             y = centerY - m._height / 2;
        }
        
        // Add the newly found position to placedRects so future nodes respect it
        placedRects.push({ x, y, w: m._width, h: m._height });
    }

    nodes.push({
      id: m.id,
      type: m._type,
      position: { x, y },
      data: m._data,
    });
  });

  return nodes;
}

export function InfiniteCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
  const [edges, , onEdgesChange] = useEdgesState([]);
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
  
  const onNodeDragStop = useCallback((event: React.MouseEvent, node: Node) => {
    updateMemoryPosition(node.id, node.position.x, node.position.y).catch(err => {
        console.error("Failed to save node position:", err);
    });
  }, []);

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
        fitViewOptions={{ padding: 0.5, maxZoom: 1 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodeDragStop={onNodeDragStop}
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
