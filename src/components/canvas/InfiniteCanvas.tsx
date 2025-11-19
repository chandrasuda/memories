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
