'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { extractMetadata } from '@/app/actions';
import { createMemory } from '@/lib/supabase';
import { Link as LinkIcon, PenTool, Loader2 } from 'lucide-react';

export function AddMemoryButton() {
  const router = useRouter();
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
      await createMemory({
        title: metadata.title,
        content: metadata.url, // Store URL in content for link types
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
              <PenTool className="mr-3 h-4 w-4" />
              <span className="font-medium">Editor</span>
            </DropdownMenuItem>
          </Link>
          <DropdownMenuItem 
            className="cursor-pointer py-3 px-4 hover:bg-gray-100 rounded-lg outline-none focus:bg-gray-100"
            onSelect={() => setIsLinkDialogOpen(true)}
          >
            <LinkIcon className="mr-3 h-4 w-4" />
            <span className="font-medium">Links</span>
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
              className="flex h-12 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-base ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
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

