import { Node } from '@xyflow/react';
import { ImageComponent } from '@/components/ui/images';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface ExpandedNodeOverlayProps {
  node: Node | null;
  onClose: () => void;
}

export function ExpandedNodeOverlay({ node, onClose }: ExpandedNodeOverlayProps) {
  if (!node) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Helper to render images grid
  const renderImages = (images: string[]) => {
    if (!images || images.length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-4 justify-center w-full">
        {images.map((src, index) => (
          <ImageComponent
            key={index}
            src={src}
            width={400}
            height={300}
            className="shadow-lg"
          />
        ))}
      </div>
    );
  };

  // Render content based on node type
  const renderContent = () => {
    switch (node.type) {
      case 'memory-node': {
        const data = node.data as any;
        const hasImages = data.images && data.images.length > 0;

        return (
          <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col gap-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>

            {/* Title */}
            {data.label && (
              <div className="font-bold text-3xl text-black">
                {data.label}
              </div>
            )}

            {/* Images Section (Top) */}
            {hasImages && (
              <div className="w-full py-4">
                {renderImages(data.images)}
              </div>
            )}

            {/* Content Section */}
            <div 
              className="text-lg text-gray-800 leading-relaxed whitespace-pre-wrap prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ 
                __html: (data.content || "")
                  .replace(/<img[^>]*>/g, '') // Remove images from expanded view as they are shown separately
              }}
            />
          </div>
        );
      }

      case 'image-node': {
        const data = node.data as any;
        return (
          <div className="relative animate-in fade-in zoom-in-95 duration-200">
            <ImageComponent
              src={data.src}
              alt={data.alt}
              width={800}
              height={600}
              className="shadow-2xl"
            />
          </div>
        );
      }

      case 'multi-image-node': {
        const data = node.data as any;
        return (
          <div className="max-w-6xl w-full p-8 animate-in fade-in zoom-in-95 duration-200">
             {renderImages(data.images)}
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-md flex items-center justify-center p-8"
      onClick={handleBackdropClick}
    >
      {renderContent()}
    </div>
  );
}

