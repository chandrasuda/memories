import { performSearch, ConversationMessage } from '@/app/actions';
import { SearchResults } from '@/components/search/SearchResults';
import { SearchBar } from '@/components/ui/SearchBar';

interface SearchPageProps {
  searchParams: Promise<{ q?: string; history?: string; memoryIds?: string }>;
}

export default async function SearchPage(props: SearchPageProps) {
  const searchParams = await props.searchParams;
  const query = searchParams.q || '';
  const historyParam = searchParams.history || '';
  const memoryIdsParam = searchParams.memoryIds || '';
  
  // Decode conversation history from URL
  let conversationHistory: ConversationMessage[] = [];
  if (historyParam) {
    try {
      conversationHistory = JSON.parse(decodeURIComponent(historyParam));
    } catch (e) {
      console.error('Failed to parse conversation history:', e);
    }
  }
  
  // Decode pinned memory IDs from URL
  let pinnedMemoryIds: string[] = [];
  if (memoryIdsParam) {
    try {
      pinnedMemoryIds = JSON.parse(decodeURIComponent(memoryIdsParam));
    } catch (e) {
      console.error('Failed to parse memory IDs:', e);
    }
  }
  
  const { memories, answer, memoryIds } = await performSearch(query, conversationHistory, pinnedMemoryIds);

  // Build updated conversation history for next query
  const updatedHistory: ConversationMessage[] = [
    ...conversationHistory,
    { role: 'user', content: query },
    ...(answer ? [{ role: 'assistant' as const, content: answer }] : [])
  ];

  return (
    <main className="min-h-screen w-full bg-[#F0F0F0] relative overflow-y-auto">
      <SearchResults 
        memories={memories} 
        answer={answer} 
        conversationHistory={updatedHistory}
        currentQuery={query}
      />
      <SearchBar conversationHistory={updatedHistory} pinnedMemoryIds={memoryIds} />
    </main>
  );
}

