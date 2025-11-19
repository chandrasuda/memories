import { InfiniteCanvas } from "@/components/canvas/InfiniteCanvas";
import { SearchBar } from "@/components/ui/SearchBar";

export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden relative">
      <InfiniteCanvas />
      <SearchBar />
    </main>
  );
}
