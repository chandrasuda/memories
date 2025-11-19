'use client';

import { InfiniteCanvas } from "@/components/canvas/InfiniteCanvas";
import { SearchBar } from "@/components/ui/SearchBar";
import { AddMemoryButton } from "@/components/AddMemoryButton";
import { SearchProvider } from "@/context/SearchContext";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [isSorted, setIsSorted] = useState(false);

  return (
    <SearchProvider>
      <main className="h-screen w-screen overflow-hidden relative">
        <InfiniteCanvas isSorted={isSorted} />
        <SearchBar />

        {/* Add Memories Button */}
        <AddMemoryButton />
        
        {/* Sort Button */}
        <Button
          onClick={() => setIsSorted(!isSorted)}
          className="fixed top-[88px] right-6 rounded-full px-6 py-3 font-semibold text-white hover:opacity-90 transition-opacity cursor-pointer z-50"
          style={{ backgroundColor: '#000', boxShadow: '0 0 8px 0 #FFF inset' }}
        >
          {isSorted ? 'Unsort' : 'Sort'}
        </Button>
      </main>
    </SearchProvider>
  );
}
