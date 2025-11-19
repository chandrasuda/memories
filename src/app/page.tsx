import Link from "next/link";
import { InfiniteCanvas } from "@/components/canvas/InfiniteCanvas";
import { SearchBar } from "@/components/ui/SearchBar";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden relative">
      <InfiniteCanvas />
      <SearchBar />

      {/* Add Memories Button */}
      <Link href="/editor">
        <Button
          className="fixed top-6 right-6 rounded-full px-6 py-3 font-semibold text-white hover:opacity-90 transition-opacity cursor-pointer"
          style={{backgroundColor: '#000', boxShadow: '0 0 8px 0 #FFF inset'}}
        >
          Add Memories
        </Button>
      </Link>
    </main>
  );
}
