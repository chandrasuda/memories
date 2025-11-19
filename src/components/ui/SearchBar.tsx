
export function SearchBar() {
  return (
    <div className="fixed bottom-[30px] left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4">
      {/* Main Search Pill */}
      <div className="h-16 bg-white/90 backdrop-blur-sm rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[#EFEEEB] flex items-center px-6 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.16)]">
        {/* Input */}
        <input
          type="text"
          placeholder="Search Memories"
          className="flex-1 bg-transparent text-[15px] text-gray-800 placeholder:text-black placeholder:opacity-60 outline-none font-semibold"
        />

        {/* Upload Button */}
        <button className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity cursor-pointer mr-[-12px]" style={{backgroundColor: '#000', boxShadow: '0 0 8px 0 #FFF inset'}}></button>
      </div>
    </div>
  );
}

