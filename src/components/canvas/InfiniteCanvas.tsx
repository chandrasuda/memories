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

import { processMemory } from '@/lib/memory-processing';
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
  const processed = memories.map(processMemory);

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

function createSortedNodes(memories: Memory[]): Node[] {
    const processed = memories.map(processMemory);
    const nodes: Node[] = [];
    
    const COLUMNS = 4;
    const GAP_X = 40;
    const GAP_Y = 40;
    
    const columnHeights = new Array(COLUMNS).fill(0).map(() => -300); // Start Y
    
    // Total width = (COLUMNS * 300) + ((COLUMNS - 1) * GAP_X)
    const totalWidth = (COLUMNS * 300) + ((COLUMNS - 1) * GAP_X);
    const startX = -(totalWidth / 2) + (300 / 2); // Start from left-most column center

    processed.forEach((m, index) => {
        const colIndex = index % COLUMNS;
        
        const x = startX + (colIndex * (300 + GAP_X)) - (m._width / 2) + (300/2); // Centered in column slot
        
        // Use accumulated height
        const y = columnHeights[colIndex];
        
        // Update column height
        columnHeights[colIndex] = y + m._height + GAP_Y;

        nodes.push({
            id: m.id,
            type: m._type,
            position: { x, y },
            data: m._data,
            draggable: true, 
        });
    });
    
    return nodes;
}

interface InfiniteCanvasProps {
    isSorted?: boolean;
}

export function InfiniteCanvas({ isSorted = false }: InfiniteCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
  const [edges, , onEdgesChange] = useEdgesState([]);
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);
  const [rawMemories, setRawMemories] = useState<Memory[]>([]);

  // Fetch memories on component mount
  useEffect(() => {
    async function loadMemories() {
      try {
        const memories = await fetchMemories();
        setRawMemories(memories);
      } catch (error) {
        console.error('Failed to load memories:', error);
      }
    }

    loadMemories();
  }, []);

  // Recalculate nodes when dependencies change
  useEffect(() => {
      if (rawMemories.length === 0) return;

      if (isSorted) {
          const sortedNodes = createSortedNodes(rawMemories);
          setNodes(sortedNodes);
      } else {
          const defaultNodes = createNodesFromMemories(rawMemories);
          setNodes(defaultNodes);
      }
  }, [isSorted, rawMemories, setNodes]);

  const handleNodeDoubleClick = (event: React.MouseEvent, node: Node) => {
    setExpandedNodeId(node.id);
  };
  
  const onNodeDragStop = useCallback((event: React.MouseEvent, node: Node) => {
    // Only save if NOT sorted
    if (!isSorted) {
        updateMemoryPosition(node.id, node.position.x, node.position.y).catch(err => {
            console.error("Failed to save node position:", err);
        });
    }
  }, [isSorted]);

  const expandedNode = nodes.find(n => n.id === expandedNodeId) || null;

  return (
    <div className="h-full w-full bg-[#F0F0F0] relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView={!isSorted} 
        fitViewOptions={{ padding: 0.2 }}
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
