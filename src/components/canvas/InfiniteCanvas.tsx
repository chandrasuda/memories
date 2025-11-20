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
import { fetchMemories, Memory, updateMemoryPosition, updateMemoryCategory, deleteMemory } from '@/lib/supabase';
import { CanvasContextMenu } from './CanvasContextMenu';

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

  // Center point (canvas origin)
  const centerX = 0;
  const centerY = 0;

  // 1. Pre-process memories to determine dimensions and types
  const processed = memories.map(processMemory);

  // 2. Sort by created_at so older memories tend to be closer to the center
  // and newer memories naturally get pushed further outward.
  const sorted = [...processed].sort((a, b) => {
    const aTime = new Date(a.created_at).getTime();
    const bTime = new Date(b.created_at).getTime();
    return aTime - bTime;
  });

  // 3. Place nodes sequentially, always avoiding already placed rectangles.
  sorted.forEach((m) => {
    let x = m.x;
    let y = m.y;

    // If no saved position, find one using a spiral that expands out
    // from the origin while avoiding all previously placed nodes.
    if (typeof x !== 'number' || typeof y !== 'number') {
      if (placedRects.length === 0) {
        // First node ever: put it at the center.
        x = centerX - m._width / 2;
        y = centerY - m._height / 2;
      } else {
        const a = 0;   // spiral offset
        const b = 25;  // distance between spiral arms
        let angle = 0.1;
        let found = false;

        while (!found) {
          const r = a + b * angle;
          const scale = 1 / Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle)));

          const candidateX = centerX + (r * Math.cos(angle)) * scale - m._width / 2;
          const candidateY = centerY + (r * Math.sin(angle)) * scale - m._height / 2;

          const candidateRect = {
            x: candidateX,
            y: candidateY,
            w: m._width,
            h: m._height,
          };

          const collision = placedRects.some((rect) =>
            isColliding(candidateRect, rect, 20)
          );

          if (!collision) {
            x = candidateX;
            y = candidateY;
            found = true;
          } else {
            const step = Math.min(0.1, 10 / (r + 10));
            angle += step;
          }

          // Safety: bail out of an extreme loop, even though in practice
          // we should find a free spot much earlier.
          if (angle > 2000) break;
        }
      }
    }

    // Record this node's rect so future nodes stay clear of it.
    placedRects.push({ x, y, w: m._width, h: m._height });

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
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);

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
          // Only create nodes if we have a different number of memories or if force refresh
          // We need to respect existing node positions if they are already in 'nodes' state
          // to prevent re-layouting everything on minor updates like category change or deletion
          
          setNodes((currentNodes) => {
             const newNodes = createNodesFromMemories(rawMemories);
             
             // If we already have nodes, try to preserve their positions
             // unless it's a new node which will have its position from spiral layout
             return newNodes.map(newNode => {
                 const existingNode = currentNodes.find(n => n.id === newNode.id);
                 if (existingNode) {
                     return {
                         ...newNode,
                         position: existingNode.position
                     };
                 }
                 return newNode;
             });
          });
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

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        nodeId: node.id,
      });
    },
    []
  );

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleDeleteNode = useCallback(async () => {
    if (!contextMenu) return;
    
    const nodeId = contextMenu.nodeId;
    
    // Optimistic update
    setRawMemories(prev => prev.filter(m => m.id !== nodeId));
    
    // Immediately update nodes state to remove the node without triggering full re-layout
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    
    handleCloseContextMenu();

    try {
      await deleteMemory(nodeId);
    } catch (error) {
      console.error('Failed to delete memory:', error);
      // Reload memories to revert state if failed
      const memories = await fetchMemories();
      setRawMemories(memories);
    }
  }, [contextMenu, handleCloseContextMenu, setNodes]);

  const handleAssignCategory = useCallback(async (category: string) => {
    if (!contextMenu) return;

    const nodeId = contextMenu.nodeId;
    
    // Optimistic update
    setRawMemories(prev => prev.map(m => m.id === nodeId ? { ...m, category } : m));
    handleCloseContextMenu();

    try {
      await updateMemoryCategory(nodeId, category);
    } catch (error) {
      console.error('Failed to update category:', error);
       // Reload memories to revert state if failed
      const memories = await fetchMemories();
      setRawMemories(memories);
    }
  }, [contextMenu, handleCloseContextMenu]);

  const onPaneClick = useCallback(() => {
    if (contextMenu) setContextMenu(null);
  }, [contextMenu]);

  const existingCategories = Array.from(new Set(rawMemories.map(m => m.category).filter(Boolean))) as string[];

  const contextNode = contextMenu ? nodes.find(n => n.id === contextMenu.nodeId) : null;
  const currentCategory = contextNode?.data?.category as string | undefined;

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
        onNodeContextMenu={handleNodeContextMenu}
        onPaneClick={onPaneClick}
      >
        <Background color="#F0F0F0" gap={16} />
      </ReactFlow>

      <ExpandedNodeOverlay 
        node={expandedNode} 
        onClose={() => setExpandedNodeId(null)} 
      />

      {contextMenu && (
        <CanvasContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={handleCloseContextMenu}
          onDelete={handleDeleteNode}
          onAssignCategory={handleAssignCategory}
          existingCategories={existingCategories}
          currentCategory={currentCategory}
        />
      )}
    </div>
  );
}
