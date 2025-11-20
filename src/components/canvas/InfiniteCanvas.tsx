'use client';

import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  NodeTypes,
  Background,
  Node,
  Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useState, useEffect, useCallback } from 'react';

import { processMemory } from '@/lib/memory-processing';
import { MemoryNode } from './MemoryNode';
import { ImageNode } from './ImageNode';
import { MultiImageNode } from './MultiImageNode';
import { LinkNode } from './LinkNode';
import { ExpandedNodeOverlay } from './ExpandedNodeOverlay';
import { ClusterNode } from './ClusterNode';
import { fetchMemories, Memory, updateMemoryPosition, updateMemoryCategory, deleteMemory } from '@/lib/supabase';
import { CanvasContextMenu } from './CanvasContextMenu';

const nodeTypes: NodeTypes = {
  'memory-node': MemoryNode,
  'image-node': ImageNode,
  'multi-image-node': MultiImageNode,
  'link-node': LinkNode,
  'cluster-node': ClusterNode,
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
    isClustered?: boolean;
}

export function InfiniteCanvas({ isSorted = false, isClustered = false }: InfiniteCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);
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

  // Helper to create a clustered layout around category centers without touching Supabase coords
  function createClusterLayout(memories: Memory[]): { nodes: Node[]; edges: Edge[] } {
    if (memories.length === 0) {
      return { nodes: [], edges: [] };
    }

    const baseNodes = createNodesFromMemories(memories);
    const processed = memories.map(processMemory);

    const nodesById = new Map<string, Node>();
    baseNodes.forEach((n) => nodesById.set(n.id, { ...n }));

    // Group all memories by category, including a fallback "No category"
    const NO_CATEGORY_KEY = 'No category';
    const categoryMap = new Map<string, ReturnType<typeof processMemory>[]>();
    processed.forEach((m) => {
      const key =
        m.category && m.category.trim().length > 0 ? m.category : NO_CATEGORY_KEY;
      const list = categoryMap.get(key) ?? [];
      list.push(m);
      categoryMap.set(key, list);
    });

    const categories = Array.from(categoryMap.keys());

    type CategoryMeta = {
      key: string;
      memories: ReturnType<typeof processMemory>[];
      perRing: number;
      ringRadii: number[];
      ringNodeCounts: number[];
      outerRadius: number;
    };

    const PER_RING = 10;
    const BASE_RADIUS = 380;
    const RING_GAP = 260;
    const NODE_ARC_MARGIN = 40;
    const RADIAL_MARGIN = 80;
    const CLUSTER_MARGIN = 220;

    const categoryMeta: CategoryMeta[] = categories.map((category) => {
      const memoriesInCategory = categoryMap.get(category) ?? [];

      // Partition memories into rings
      const rings: ReturnType<typeof processMemory>[][] = [];
      memoriesInCategory.forEach((m, idx) => {
        const ringIndex = Math.floor(idx / PER_RING);
        if (!rings[ringIndex]) {
          rings[ringIndex] = [];
        }
        rings[ringIndex].push(m);
      });

      const ringRadii: number[] = [];
      const ringNodeCounts: number[] = [];

      let maxNodeHeight = 0;

      rings.forEach((ring, ringIndex) => {
        let totalArcLength = 0;

        ring.forEach((mem) => {
          const width = mem._width ?? 290;
          const height = mem._height ?? 200;
          totalArcLength += width + NODE_ARC_MARGIN;
          maxNodeHeight = Math.max(maxNodeHeight, height);
        });

        const baseRadius = BASE_RADIUS + ringIndex * RING_GAP;
        const minRadiusForWidths =
          totalArcLength > 0 ? totalArcLength / (2 * Math.PI) : 0;
        const radius = Math.max(baseRadius, minRadiusForWidths);

        ringRadii[ringIndex] = radius;
        ringNodeCounts[ringIndex] = ring.length;
      });

      const lastRingRadius =
        ringRadii.length > 0 ? ringRadii[ringRadii.length - 1] : BASE_RADIUS;
      const outerRadius = lastRingRadius + maxNodeHeight / 2 + RADIAL_MARGIN;

      return {
        key: category,
        memories: memoriesInCategory,
        perRing: PER_RING,
        ringRadii,
        ringNodeCounts,
        outerRadius,
      };
    });

    const totalSize = categoryMeta.reduce(
      (sum, meta) => sum + meta.outerRadius * 2 + CLUSTER_MARGIN,
      0
    );

    const MIN_CLUSTER_CENTER_RADIUS = 1000;
    const circleRadius = Math.max(MIN_CLUSTER_CENTER_RADIUS, totalSize / (2 * Math.PI));

    const clusterNodes: Node[] = [];
    const edges: Edge[] = [];

    let currentAngle = 0;

    categoryMeta.forEach((meta) => {
      const segmentSize = meta.outerRadius * 2 + CLUSTER_MARGIN;
      const angleSpan = (segmentSize / totalSize) * 2 * Math.PI;
      const angle = currentAngle + angleSpan / 2;
      currentAngle += angleSpan;

      const centerX = circleRadius * Math.cos(angle);
      const centerY = circleRadius * Math.sin(angle);

      const clusterId = `cluster-${meta.key}`;

      clusterNodes.push({
        id: clusterId,
        type: 'cluster-node',
        position: { x: centerX, y: centerY },
        data: {
          label: meta.key,
          count: meta.memories.length,
          __clusterKey: meta.key,
        },
        draggable: true,
      });

      meta.memories.forEach((m, idx) => {
        const node = nodesById.get(m.id);
        if (!node) return;

        const ring = Math.floor(idx / meta.perRing);
        const posInRing = idx % meta.perRing;

        const ringRadius = meta.ringRadii[ring] ?? BASE_RADIUS;
        const nodesInRing = meta.ringNodeCounts[ring] || 1;
        const theta = (2 * Math.PI * posInRing) / nodesInRing;

        const width = m._width ?? 290;
        const height = m._height ?? 200;

        const x = centerX + ringRadius * Math.cos(theta) - width / 2;
        const y = centerY + ringRadius * Math.sin(theta) - height / 2;

        nodesById.set(m.id, {
          ...node,
          position: { x, y },
          data: {
            ...(node.data ?? {}),
            __clusterKey: meta.key,
          },
        });

        edges.push({
          id: `edge-${clusterId}-${m.id}`,
          source: clusterId,
          target: m.id,
          type: 'smoothstep',
          style: {
            stroke: '#000000',
            strokeWidth: 1.4,
          },
        });
      });
    });

    const finalNodes: Node[] = [...nodesById.values(), ...clusterNodes];

    return { nodes: finalNodes, edges };
  }

  // Recalculate nodes when dependencies change
  useEffect(() => {
      if (rawMemories.length === 0) return;

      if (isClustered) {
          const { nodes: clusteredNodes, edges: clusteredEdges } = createClusterLayout(rawMemories);
          setNodes(clusteredNodes);
          setEdges(clusteredEdges);
          return;
      }

      // Not clustered: clear any cluster edges
      setEdges([]);

      if (isSorted) {
          const sortedNodes = createSortedNodes(rawMemories);
          setNodes(sortedNodes);
      } else {
          // Default free layout based on Supabase coordinates / spiral
          const freeNodes = createNodesFromMemories(rawMemories);
          setNodes(freeNodes);
      }
  }, [isSorted, isClustered, rawMemories, setNodes, setEdges]);

  const handleNodeDoubleClick = (event: React.MouseEvent, node: Node) => {
    setExpandedNodeId(node.id);
  };

  const handleNodeDrag = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (!isClustered || !node.id.startsWith('cluster-')) {
        return;
      }

      setNodes((prevNodes) => {
        const prevClusterNode = prevNodes.find((n) => n.id === node.id);
        if (!prevClusterNode) return prevNodes;

        const dx = node.position.x - prevClusterNode.position.x;
        const dy = node.position.y - prevClusterNode.position.y;

        if (dx === 0 && dy === 0) return prevNodes;

        const clusterKey =
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (node.data as any)?.__clusterKey ??
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (node.data as any)?.label;

        return prevNodes.map((n) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const nClusterKey = (n.data as any)?.__clusterKey;

          if (n.id === node.id) {
            return {
              ...node,
              data: {
                ...(node.data ?? {}),
                __clusterKey: clusterKey,
              },
            };
          }

          if (nClusterKey !== clusterKey) {
            return n;
          }

          return {
            ...n,
            position: {
              x: n.position.x + dx,
              y: n.position.y + dy,
            },
          };
        });
      });
    },
    [isClustered, setNodes]
  );

  const onNodeDragStop = useCallback((event: React.MouseEvent, node: Node) => {
    // Only save if NOT sorted and NOT clustered, and ignore synthetic cluster nodes
    if (!isSorted && !isClustered && !node.id.startsWith('cluster-')) {
        updateMemoryPosition(node.id, node.position.x, node.position.y).catch(err => {
            console.error("Failed to save node position:", err);
        });
    }
  }, [isSorted, isClustered]);

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
        fitView={isClustered || !isSorted} 
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodeDrag={handleNodeDrag}
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
