import { InfiniteCanvas } from "@/components/canvas/InfiniteCanvas";

export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden" style={{ backgroundColor: '#FDDAC6' }}>
      <InfiniteCanvas />
    </main>
  );
}
