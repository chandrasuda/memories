
'use client';

import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { useSearch } from "@/context/SearchContext";

export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [isPending, startTransition] = useTransition();
  const { isSearching, triggerSearch } = useSearch();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      if (query.trim()) {
        const currentQ = searchParams.get("q");
        if (currentQ === query) {
          triggerSearch();
        } else {
          router.push(`/?q=${encodeURIComponent(query)}`);
        }
      } else {
        router.push("/");
      }
    });
  };

  const isLoading = isPending || isSearching;

  return (
    <div className="fixed bottom-[30px] left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4">
      {/* Main Search Pill */}
      <form 
        onSubmit={handleSearch}
        className="h-16 bg-white/90 backdrop-blur-sm rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[#EFEEEB] flex items-center px-6 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.16)]"
      >
        {/* Input */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Memories"
          className="flex-1 bg-transparent text-[15px] text-gray-800 placeholder:text-black placeholder:opacity-60 outline-none font-semibold"
        />

        {/* Upload Button */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity cursor-pointer mr-[-12px] p-0 border-0"
          style={{backgroundColor: '#000', boxShadow: '0 0 8px 0 #FFF inset'}}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.35449 12.9722C10.4572 12.9722 12.9722 10.4572 12.9722 7.35449C12.9722 4.25178 10.4572 1.73682 7.35449 1.73682C4.25178 1.73682 1.73682 4.25178 1.73682 7.35449C1.73682 10.4572 4.25178 12.9722 7.35449 12.9722Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M11.2617 11.2617L13.8984 13.8984" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          )}
        </Button>
      </form>
    </div>
  );
}

