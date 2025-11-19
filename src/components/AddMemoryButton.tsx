'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { extractMetadata, createMemoryWithEmbedding } from '@/app/actions';
import { Link as LinkIcon, PenTool, Loader2, Image as ImageIcon } from 'lucide-react';

export function AddMemoryButton() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Handle incoming save_url parameter from extension
  useEffect(() => {
    const saveUrl = searchParams.get('save_url');
    if (saveUrl) {
      setUrl(saveUrl);
      setIsLinkDialogOpen(true);
      // Clean up URL
      window.history.replaceState({}, '', '/');
    }
  }, [searchParams]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      // Dynamically import supabase to avoid build issues
      const { supabase } = await import('@/lib/supabase');
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = `memory-images/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

        const { error: uploadError } = await supabase.storage
          .from('memories-images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload failed for file:', file.name, uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('memories-images')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      if (uploadedUrls.length > 0) {
        // Note: We are NOT sending 'type' field to avoid errors if the column doesn't exist in DB yet.
        // The InfiniteCanvas will infer it's an image node based on assets presence and empty content.
        await createMemoryWithEmbedding({
          title: 'Image Memory', // Placeholder title
          content: '', // Empty content for image-only memories
          assets: uploadedUrls,
        });
        
        window.location.reload();
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Failed to upload images. Please try again.');
    } finally {
      setIsUploading(false);
      // Reset input
      event.target.value = '';
    }
  };

  const handleSaveLink = async () => {
    if (!url) return;

    setIsLoading(true);
    try {
      // Normalize URL
      const normalizedUrl = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`;

      // 1. Extract metadata
      let metadata;
      try {
        metadata = await extractMetadata(normalizedUrl);
      } catch (err) {
        console.error("Metadata extraction failed", err);
        // Fallback if server action fails completely
        metadata = {
          title: new URL(normalizedUrl).hostname,
          description: '',
          image: null,
          url: normalizedUrl
        };
      }
      
      if (!metadata) {
        // Double fallback just in case
         metadata = {
          title: new URL(normalizedUrl).hostname,
          description: '',
          image: null,
          url: normalizedUrl
        };
      }

      // 2. Create memory
      // Note: We are NOT sending 'type' field to avoid errors if the column doesn't exist in DB yet.
      // The InfiniteCanvas will infer it's a link node based on content being a URL.
      // We store URL and description in content separated by a newline to preserve both.
      // We also append the scraped content for RAG purposes.
      const scrapedContent = metadata.content || '';
      // Limit scraped content to avoid hitting token limits too easily, though embedding models handle large context usually.
      // But for display in LinkNode, we rely on line-clamp.
      
      await createMemoryWithEmbedding({
        title: metadata.title,
        content: `${metadata.url}\n${metadata.description || ''}\n\n${scrapedContent}`, 
        assets: metadata.image ? [metadata.image] : [],
      });

      // 3. Close dialog and reset
      setIsLinkDialogOpen(false);
      setUrl('');
      
      // 4. Refresh to show new memory
      window.location.reload();
      
    } catch (error) {
      console.error('Failed to save link memory:', error);
      alert('Failed to save link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="fixed top-6 right-6 rounded-full px-6 py-3 font-semibold text-white hover:opacity-90 transition-opacity cursor-pointer z-50"
            style={{ backgroundColor: '#000', boxShadow: '0 0 8px 0 #FFF inset' }}
          >
            Add Memories
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-white border border-gray-200 shadow-lg rounded-xl p-1 z-[60]">
          <Link href="/editor">
            <DropdownMenuItem className="cursor-pointer py-3 px-4 hover:bg-gray-100 rounded-lg outline-none focus:bg-gray-100">
              <PenTool className="mr-3 h-4 w-4 text-black/90" />
              <span className="font-medium text-black/90">Editor</span>
            </DropdownMenuItem>
          </Link>
          <DropdownMenuItem
            className="cursor-pointer py-3 px-4 hover:bg-gray-100 rounded-lg outline-none focus:bg-gray-100"
            onSelect={() => setIsLinkDialogOpen(true)}
          >
            <LinkIcon className="mr-3 h-4 w-4 text-black/90" />
            <span className="font-medium text-black/90">Links</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer py-3 px-4 hover:bg-gray-100 rounded-lg outline-none focus:bg-gray-100 relative"
            onSelect={(e) => e.preventDefault()}
          >
            <ImageIcon className="mr-3 h-4 w-4 text-black/90" />
            <span className="font-medium text-black/90">
              {isUploading ? 'Uploading...' : 'Media'}
            </span>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-black">Add a Link</DialogTitle>
            <DialogDescription className="text-gray-500">
              Paste a URL to create a memory from a website.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <input
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex h-12 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-base text-black/90 ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveLink();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button 
              onClick={handleSaveLink} 
              disabled={isLoading || !url}
              className="w-full h-12 rounded-xl bg-black text-white hover:bg-gray-800 font-medium text-base transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Link'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

