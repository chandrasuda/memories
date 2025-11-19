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

      case 'link-node': {
        const data = node.data as any;
        const hasImage = data.images && data.images.length > 0;
        const imageUrl = hasImage ? data.images[0] : null;

        return (
          <div className="bg-[#242424] rounded-3xl overflow-hidden shadow-2xl max-w-2xl w-full relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full transition-colors z-10"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {/* Large Preview Image */}
            {imageUrl && (
              <div className="w-full aspect-video bg-gray-900">
                <img
                  src={imageUrl}
                  alt={data.label || "Link preview"}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="p-8 flex flex-col gap-4">
              {/* Title */}
              <div className="font-bold text-2xl text-white leading-tight">
                {data.label}
              </div>

              {/* URL */}
              {data.url && (
                <a 
                  href={data.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 hover:underline text-lg truncate"
                >
                  {data.url}
                </a>
              )}
            </div>
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

