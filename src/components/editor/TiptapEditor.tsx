'use client';

import { useEditor, EditorContent, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, Strikethrough, Heading1, Heading2, List, ListOrdered, Quote, Undo, Redo, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCallback, useState, useEffect } from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';

const ImageComponent = (props: NodeViewProps) => {
  const { node, updateAttributes, selected } = props;
  
  return (
    <NodeViewWrapper className="relative inline-block">
      <img
        src={node.attrs.src}
        alt={node.attrs.alt}
        className={cn(
          "rounded-lg transition-all duration-200"
        )}
      />
    </NodeViewWrapper>
  );
};

const CustomImage = Image.extend({
  addNodeView() {
    return ReactNodeViewRenderer(ImageComponent);
  },
});

const ToolbarButton = ({ 
  onClick, 
  isActive = false, 
  children 
}: { 
  onClick: () => void; 
  isActive?: boolean; 
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "p-2 rounded-md transition-all hover:bg-gray-100",
      isActive ? "bg-black text-white shadow-[0_0_8px_0_#FFF_inset]" : "text-gray-600"
    )}
  >
    {children}
  </button>
);

export function TiptapEditor({
  content = '<p>Start writing your memory...</p>',
  onChange,
  onAssetsChange
}: {
  content?: string;
  onChange?: (content: string) => void;
  onAssetsChange?: (assets: string[]) => void;
}) {
  const [assets, setAssets] = useState<string[]>([]);

  // Notify parent component when assets change
  useEffect(() => {
    onAssetsChange?.(assets);
  }, [assets, onAssetsChange]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      CustomImage,
      Placeholder.configure({
        placeholder: 'Start writing your memory...',
      }),
    ],
    content: content === '<p>Start writing your memory...</p>' ? '' : content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[300px]',
      },
    },
  });

  const addImage = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;

    input.onchange = async (event) => {
      const files = (event.target as HTMLInputElement).files;
      if (files && files.length > 0 && editor) {
        try {
          // Dynamically import supabase to avoid build issues
          const { supabase } = await import('@/lib/supabase');

          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            // Create unique filename with timestamp
            const fileName = `memory-images/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

            // Upload to Supabase Storage
            const { data, error: uploadError } = await supabase.storage
              .from('memories-images')
              .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
              });

            if (uploadError) {
              console.error('Upload failed for file:', file.name, uploadError);
              continue; // Skip this file and try the next one
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
              .from('memories-images')
              .getPublicUrl(fileName);

            // Insert image into editor
            editor.chain().focus().setImage({ src: publicUrl }).run();

            // Add URL to assets array
            setAssets(prev => [...prev, publicUrl]);
          }

        } catch (error) {
          console.error('Error uploading images:', error);
          alert('Failed to upload images. Please try again.');
        }
      }
    };

    input.click();
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-3xl shadow-sm border border-[#EFEEEB] overflow-hidden flex flex-col h-[calc(100vh-120px)]">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-4 border-b border-[#EFEEEB] bg-white/50 backdrop-blur-sm sticky top-0 z-10 overflow-x-auto">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
        >
          <Bold className="w-5 h-5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
        >
          <Italic className="w-5 h-5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
        >
          <Strikethrough className="w-5 h-5" />
        </ToolbarButton>
        
        <div className="w-px h-6 bg-gray-200 mx-2" />
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
        >
          <Heading1 className="w-5 h-5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
        >
          <Heading2 className="w-5 h-5" />
        </ToolbarButton>
        
        <div className="w-px h-6 bg-gray-200 mx-2" />
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
        >
          <List className="w-5 h-5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
        >
          <ListOrdered className="w-5 h-5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
        >
          <Quote className="w-5 h-5" />
        </ToolbarButton>

        <div className="w-px h-6 bg-gray-200 mx-2" />

        <ToolbarButton onClick={addImage}>
          <ImageIcon className="w-5 h-5" />
        </ToolbarButton>

        <div className="w-px h-6 bg-gray-200 mx-2" />

        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo className="w-5 h-5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo className="w-5 h-5" />
        </ToolbarButton>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

