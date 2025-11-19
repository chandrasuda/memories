import { InfiniteCanvas } from "@/components/canvas/InfiniteCanvas";
import { SearchBar } from "@/components/ui/SearchBar";
import { AddMemoryButton } from "@/components/AddMemoryButton";

export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden relative">
      <InfiniteCanvas />
      <SearchBar />

      {/* Add Memories Button */}
      <AddMemoryButton />
    </main>
  );
}
