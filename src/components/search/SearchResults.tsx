'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useRouter } from 'next/navigation';
import { Memory } from '@/lib/supabase';
import { processMemory } from '@/lib/memory-processing';
import { MemoryNode } from '@/components/canvas/MemoryNode';
import { ImageNode } from '@/components/canvas/ImageNode';
import { MultiImageNode } from '@/components/canvas/MultiImageNode';
import { LinkNode } from '@/components/canvas/LinkNode';
import { ExpandedNodeOverlay } from '@/components/canvas/ExpandedNodeOverlay';
import { Node } from '@xyflow/react';

interface SearchResultsProps {
  memories: Memory[];
  answer: string | null;
}

export function SearchResults({ memories, answer }: SearchResultsProps) {
  const router = useRouter();
  const [expandedNode, setExpandedNode] = useState<Node | null>(null);

  const processedNodes = memories.map(m => {
    const processed = processMemory(m);
    return {
      id: processed.id,
      type: processed._type,
      data: processed._data,
      position: { x: 0, y: 0 }, // Dummy position
      width: processed._width,
      height: processed._height,
    } as Node;
  });

  const renderNode = (node: Node) => {
    const props = {
      id: node.id,
      data: node.data,
      type: node.type || 'memory-node',
      selected: false,
      zIndex: 0,
      isConnectable: false,
      xPos: 0,
      yPos: 0,
      dragging: false,
    };

    // We need to cast props to any because NodeProps is complex and we are not in ReactFlow
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ComponentProps: any = props;

    switch (node.type) {
      case 'memory-node':
        return <MemoryNode {...ComponentProps} />;
      case 'image-node':
        return <ImageNode {...ComponentProps} />;
      case 'multi-image-node':
        return <MultiImageNode {...ComponentProps} />;
      case 'link-node':
        return <LinkNode {...ComponentProps} />;
      default:
        return <MemoryNode {...ComponentProps} />;
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-32 pt-8 px-4 max-w-5xl mx-auto">
      {/* RAG Answer Section */}
      {answer && (
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[#EFEEEB] p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
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
              onClick={() => router.push('/')}
              className="text-gray-400 hover:text-black transition-colors p-1 hover:bg-gray-100 rounded-full"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* Memories Grid */}
      {processedNodes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
          {processedNodes.map((node) => (
            <div 
              key={node.id} 
              onClick={() => setExpandedNode(node)}
              className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {renderNode(node)}
            </div>
          ))}
        </div>
      ) : (
        !answer && (
          <div className="text-center text-gray-500 mt-12">
            No memories found.
          </div>
        )
      )}

      <ExpandedNodeOverlay 
        node={expandedNode} 
        onClose={() => setExpandedNode(null)} 
      />
    </div>
  );
}

