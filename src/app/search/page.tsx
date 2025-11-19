import { performSearch } from '@/app/actions';
import { SearchResults } from '@/components/search/SearchResults';
import { SearchBar } from '@/components/ui/SearchBar';

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage(props: SearchPageProps) {
  const searchParams = await props.searchParams;
  const query = searchParams.q || '';
  
  const { memories, answer } = await performSearch(query);

  return (
    <main className="min-h-screen w-full bg-[#F0F0F0] relative overflow-y-auto">
      <SearchResults memories={memories} answer={answer} />
      <SearchBar />
    </main>
  );
}

