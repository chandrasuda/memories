'use client';

import React, { createContext, useContext, useState } from 'react';

interface SearchContextType {
  isSearching: boolean;
  setIsSearching: (value: boolean) => void;
  searchTrigger: number;
  triggerSearch: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [isSearching, setIsSearching] = useState(false);
  const [searchTrigger, setSearchTrigger] = useState(0);

  const triggerSearch = () => setSearchTrigger(prev => prev + 1);

  return (
    <SearchContext.Provider value={{ isSearching, setIsSearching, searchTrigger, triggerSearch }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}
