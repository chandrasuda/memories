'use client';

import { InfiniteCanvas } from "@/components/canvas/InfiniteCanvas";
import { SearchBar } from "@/components/ui/SearchBar";
import { AddMemoryButton } from "@/components/AddMemoryButton";
import { SearchProvider } from "@/context/SearchContext";

export default function Home() {
  return (
    <SearchProvider>
      <main className="h-screen w-screen overflow-hidden relative">
        <InfiniteCanvas />
        <SearchBar />

        {/* Add Memories Button */}
        <AddMemoryButton />
      </main>
    </SearchProvider>
  );
}
