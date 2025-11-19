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
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

import { MemoryNode } from './MemoryNode';
import { ImageNode } from './ImageNode';
import { MultiImageNode } from './MultiImageNode';
import { LinkNode } from './LinkNode';
import { ExpandedNodeOverlay } from './ExpandedNodeOverlay';
import { fetchMemories, Memory, updateMemoryPosition } from '@/lib/supabase';
import { performSearch } from '@/app/actions';
import { useSearch } from '@/context/SearchContext';
import ReactMarkdown from 'react-markdown';

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

// Recursive function to resolve overlaps
// Returns true if any node was moved
function resolveOverlaps(nodes: Node[], padding: number = 50): boolean {
    let moved = false;
    // Simple iterative solver. Repeat a few times to propagate changes.
    // A force-directed approach would be better for large graphs but complex to implement quickly without a library.
    // Here we'll use a simple "push away" logic.
    
    const iterations = 5; // Limit iterations to prevent infinite loops
    
    for (let iter = 0; iter < iterations; iter++) {
        let iterMoved = false;
        
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const n1 = nodes[i];
                const n2 = nodes[j];
                
                // Approximate dimensions if not strictly known yet, but we usually set them in data or assume standard
                // We stored _width and _height in our custom properties when creating nodes, but React Flow nodes don't carry them by default at root level unless we put them there.
                // Let's assume our custom node creation logic added width/height to the node object itself or data.
                // In this file, we did not explicitly add width/height to the Node object root (except in previous step we saw `width` variable but not assigned to `node.width`).
                // React Flow `node.measured` is available only after render.
                // But we can use our estimated dimensions from `processMemory` if we persist them.
                // Let's assume standard 300x300 if missing for now, or read from data if we attached it.
                
                const w1 = (n1.data?.width as number) || (n1.type === 'memory-node' ? 290 : 300);
                const h1 = (n1.data?.height as number) || (n1.type === 'memory-node' ? 200 : 280);
                
                const w2 = (n2.data?.width as number) || (n2.type === 'memory-node' ? 290 : 300);
                const h2 = (n2.data?.height as number) || (n2.type === 'memory-node' ? 200 : 280);
                
                if (isColliding(
                    { x: n1.position.x, y: n1.position.y, w: w1, h: h1 },
                    { x: n2.position.x, y: n2.position.y, w: w2, h: h2 },
                    padding
                )) {
                    // Collision detected. Move n2 away from n1.
                    // Direction vector
                    let dx = (n2.position.x + w2/2) - (n1.position.x + w1/2);
                    let dy = (n2.position.y + h2/2) - (n1.position.y + h1/2);
                    
                    if (dx === 0 && dy === 0) {
                        dx = 1; // Prevent div by zero
                    }
                    
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    // Normalize and push
                    // How much to push?
                    // We need to separate them by at least (radius1 + radius2)? Or just box overlap?
                    // Simple box push: find overlap amounts
                    
                    // Simpler approach: Push n2 in direction of (dx, dy) by a fixed step or overlap amount.
                    // Let's just push by a small step and let next iteration resolve more.
                    // Or push completely out.
                    
                    const overlapX = (w1 + w2)/2 + padding - Math.abs(dx);
                    const overlapY = (h1 + h2)/2 + padding - Math.abs(dy);
                    
                    if (overlapX > 0 && overlapY > 0) {
                         // Push in the axis of least overlap to minimize movement
                         if (overlapX < overlapY) {
                             const signX = dx > 0 ? 1 : -1;
                             n2.position.x += overlapX * signX;
                         } else {
                             const signY = dy > 0 ? 1 : -1;
                             n2.position.y += overlapY * signY;
                         }
                         iterMoved = true;
                         moved = true;
                    }
                }
            }
        }
        if (!iterMoved) break;
    }
    return moved;
}


// Preprocess memory to determine type and dimensions
function processMemory(memory: Memory) {
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
      // Store dimensions in data for collision detection later
      width,
      height
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
  
  // 4. Final overlap check and resolution
  // Even with spiral placement, we might have overlaps if existing saved positions are close to each other
  // or if spiral placement wasn't perfect (though it checks placedRects).
  // The user specifically asked to resolve overlaps for "non-user created arrangement" or just generally.
  // "prevet overlap on node in stationary position" -> run resolution.
  resolveOverlaps(nodes, 20);

  return nodes;
}

function createSortedNodes(memories: Memory[]): Node[] {
    const processed = memories.map(processMemory);
    const nodes: Node[] = [];
    
    const COLUMNS = 4; // Changed to 4 columns as requested
    const GAP_X = 40;
    const GAP_Y = 40;
    
    // To center 4 columns:
    // We need to calculate total width.
    // Assuming avg width 300 + gap.
    // Let's calculate positions dynamically relative to center.
    
    const columnHeights = new Array(COLUMNS).fill(0).map(() => -300); // Start Y
    
    // Total width = (COLUMNS * 300) + ((COLUMNS - 1) * GAP_X)
    // But widths vary slightly (290 vs 300). Let's assume 300 for grid alignment.
    const GRID_COL_WIDTH = 340; // 300 + 40 gap roughly
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
  const [answer, setAnswer] = useState<string | null>(null);
  const { isSearching, setIsSearching, searchTrigger } = useSearch();
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q');
  const [rawMemories, setRawMemories] = useState<Memory[]>([]);

  // Fetch memories on component mount or when query changes
  useEffect(() => {
    async function loadMemories() {
      setIsSearching(true);
      try {
        let memories: Memory[];
        let ragAnswer: string | null = null;

        if (query) {
          const result = await performSearch(query);
          memories = result.memories;
          ragAnswer = result.answer;
        } else {
          memories = await fetchMemories();
        }
        
        setRawMemories(memories);
        setAnswer(ragAnswer);
      } catch (error) {
        console.error('Failed to load memories:', error);
      } finally {
        setIsSearching(false);
      }
    }

    loadMemories();
  }, [query, setIsSearching, searchTrigger]);

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
        // We should check for overlaps after drag stop and resolve them?
        // The user said "prevent overlap on node in stationary position".
        // If user drops node A on node B, B should move.
        
        setNodes((nds) => {
             // Create a copy to mutate
             const newNodes = nds.map(n => ({...n}));
             const moved = resolveOverlaps(newNodes, 20);
             
             if (moved) {
                 // If we moved nodes, we should save their new positions to DB
                 newNodes.forEach(n => {
                     // Optimization: only save modified ones? 
                     // For simplicity, we can just save the dragged one and any that were pushed.
                     // But tracking which moved is complex inside helper.
                     // Let's just save the one the user dragged explicitly first (handled below)
                     // And then maybe save all? Saving all is expensive.
                     // Let's rely on the fact that if they overlap, the next load will resolve them anyway, 
                     // OR better: save the specific node that was dragged.
                     // The pushed nodes will "snap back" on reload unless saved.
                     // To truly persist the "pushed away" state, we must save those pushed nodes.
                     
                     // Check if position changed from original 'nds'
                     const original = nds.find(o => o.id === n.id);
                     if (original && (original.position.x !== n.position.x || original.position.y !== n.position.y)) {
                         updateMemoryPosition(n.id, n.position.x, n.position.y).catch(console.error);
                     }
                 });
             }
             
             // Also ensure the dragged node position is saved (already covered by logic above if it moved, but if it didn't move by overlap but just by user drag, we still save)
             // Actually the above logic covers "moved by overlap resolution".
             // But if no overlap, we still need to save the user's drag result.
             // So we should always save the target node 'node' at its new position in 'newNodes'.
             
             // Re-find the dragged node in the new set
             const updatedDraggedNode = newNodes.find(n => n.id === node.id);
             if (updatedDraggedNode) {
                 updateMemoryPosition(updatedDraggedNode.id, updatedDraggedNode.position.x, updatedDraggedNode.position.y).catch(console.error);
             }

             return newNodes;
        });
    }
  }, [isSorted, setNodes]);

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

      {/* RAG Answer Overlay */}
      {answer && !isSearching && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4 pointer-events-none">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[#EFEEEB] p-6 pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center shrink-0 text-white shadow-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 12 2.1 12a10.1 10.1 0 0 0 1.4 2.9l8.5-2.9z"/><path d="M12 12V2.1A10.1 10.1 0 0 0 9.1 3.5l2.9 8.5z"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-p:text-gray-800 prose-headings:text-gray-900 prose-strong:text-gray-900 prose-ul:my-2 prose-li:my-0.5">
                  <ReactMarkdown>{answer}</ReactMarkdown>
                </div>
              </div>
              <button 
                onClick={() => {
                  setAnswer(null);
                  router.push('/');
                }}
                className="text-gray-400 hover:text-black transition-colors p-1 hover:bg-gray-100 rounded-full"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <ExpandedNodeOverlay 
        node={expandedNode} 
        onClose={() => setExpandedNodeId(null)} 
      />
    </div>
  );
}
