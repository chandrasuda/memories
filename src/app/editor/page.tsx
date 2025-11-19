'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TiptapEditor } from '@/components/editor/TiptapEditor';
import { useRouter } from 'next/navigation';

export default function EditorPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [assets, setAssets] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Please enter a title for your memory');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Dynamically import supabase to avoid build-time issues
      const { supabase } = await import('@/lib/supabase');

      const { data, error: supabaseError } = await supabase
        .from('memories')
        .insert([
          {
            title: title.trim(),
            content: content.trim(),
            assets: assets.length > 0 ? assets : null,
          }
        ])
        .select()
        .single();

      if (supabaseError) {
        throw supabaseError;
      }

      console.log('Memory saved successfully:', data);

      // Redirect to home page or show success message
      router.push('/');

    } catch (err) {
      console.error('Error saving memory:', err);
      setError(err instanceof Error ? err.message : 'Failed to save memory');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F0F0F0] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/50">
                <ArrowLeft className="w-6 h-6" />
              </Button>
            </Link>
          </div>
          
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" className="text-gray-600 hover:bg-transparent">
                Cancel
              </Button>
            </Link>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-full px-6 font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              style={{backgroundColor: '#000', boxShadow: '0 0 8px 0 #FFF inset'}}
            >
              {isSaving ? 'Saving...' : 'Save Memory'}
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Title Input */}
        <input
          type="text"
          placeholder="Memory Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full text-4xl font-bold text-gray-900 placeholder:text-gray-300 border-none focus:ring-0 bg-transparent mb-8 px-2 outline-none"
        />

        {/* Editor */}
        <TiptapEditor
          content={content}
          onChange={setContent}
          onAssetsChange={setAssets}
        />
      </div>
    </main>
  );
}

