'use client';

import { InfiniteCanvas } from "@/components/canvas/InfiniteCanvas";
import { SearchBar } from "@/components/ui/SearchBar";
import { AddMemoryButton } from "@/components/AddMemoryButton";
import { SearchProvider } from "@/context/SearchContext";
import { useState, Suspense } from "react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [isSorted, setIsSorted] = useState(false);
  const [isClustered, setIsClustered] = useState(false);

  return (
    <SearchProvider>
      <main className="h-screen w-screen overflow-hidden relative">
        <InfiniteCanvas isSorted={isSorted} isClustered={isClustered} />
        <Suspense fallback={<div>Loading search...</div>}>
          <SearchBar />
        </Suspense>

        {/* Button Container */}
        <div className="fixed top-6 right-6 flex flex-col gap-4 z-50">
          <Suspense fallback={<div>Loading...</div>}>
            <AddMemoryButton />
          </Suspense>
          <Button
            onClick={() => setIsSorted(!isSorted)}
            className="rounded-full px-6 py-3 font-semibold text-white hover:opacity-90 transition-opacity cursor-pointer"
            style={{ backgroundColor: '#000', boxShadow: '0 0 8px 0 #FFF inset' }}
          >
            {isSorted ? 'Unsort' : 'Sort'}
          </Button>
          <Button
            onClick={() => setIsClustered(!isClustered)}
            className="rounded-full px-6 py-3 font-semibold text-white hover:opacity-90 transition-opacity cursor-pointer"
            style={{ backgroundColor: '#000', boxShadow: '0 0 8px 0 #FFF inset' }}
          >
            {isClustered ? 'Un-cluster' : 'Cluster'}
          </Button>
        </div>
      </main>
    </SearchProvider>
  );
}
