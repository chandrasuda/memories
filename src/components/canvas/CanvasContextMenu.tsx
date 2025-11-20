import { useEffect, useRef, useState } from 'react';
import { Trash2, Tag, Plus } from 'lucide-react';

import { Check } from 'lucide-react';

interface CanvasContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onDelete: () => void;
  onAssignCategory: (category: string) => void;
  existingCategories: string[];
  currentCategory?: string;
}

export function CanvasContextMenu({ 
  x, 
  y, 
  onClose, 
  onDelete, 
  onAssignCategory,
  existingCategories,
  currentCategory
}: CanvasContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategory.trim()) {
      onAssignCategory(newCategory.trim());
      setNewCategory('');
      setShowCategoryInput(false);
    }
  };

  return (
    <div 
      ref={ref}
      className="absolute z-50 bg-white rounded-xl shadow-2xl border border-gray-100 p-1 min-w-[200px] flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-100"
      style={{ top: y, left: x }}
    >
      {/* Add Category Section */}
      <div className="relative group/item">
        <button className="w-full text-left px-3 py-2.5 text-sm text-black hover:bg-gray-100 rounded-lg flex justify-between items-center group-hover/item:bg-gray-100 transition-colors font-medium">
          <div className="flex items-center gap-2">
            <Tag size={14} className="text-gray-600" />
            <span>Add Category</span>
          </div>
          <span className="text-gray-400">▸</span>
        </button>
        
        {/* Submenu - Aligned properly */}
        <div className="absolute left-full top-0 ml-1 hidden group-hover/item:block bg-white rounded-xl shadow-2xl border border-gray-100 p-1 min-w-[180px]">
           {existingCategories.length > 0 && (
             <div className="max-h-[200px] overflow-y-auto">
               {existingCategories.map(cat => (
                 <button 
                   key={cat}
                   onClick={() => onAssignCategory(cat)}
                   className="w-full text-left px-3 py-2 text-sm text-black hover:bg-gray-100 rounded-lg truncate flex justify-between items-center font-medium"
                 >
                   <span>{cat}</span>
                   {currentCategory === cat && <Check size={12} className="text-black" />}
                 </button>
               ))}
               <div className="h-[1px] bg-gray-100 my-1" />
             </div>
           )}
           
           {showCategoryInput ? (
             <form onSubmit={handleCreateCategory} className="p-2">
               <input
                 autoFocus
                 type="text"
                 value={newCategory}
                 onChange={(e) => setNewCategory(e.target.value)}
                 placeholder="Category name..."
                 className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-black focus:ring-1 focus:ring-black text-black bg-white mb-2"
                 onKeyDown={(e) => {
                   if (e.key === 'Escape') {
                     e.stopPropagation();
                     setShowCategoryInput(false);
                   }
                 }}
               />
               <div className="flex gap-2">
                 <button type="submit" className="flex-1 bg-black text-white text-xs font-medium py-2 rounded-lg hover:opacity-90 transition-opacity">Add</button>
                 <button type="button" onClick={() => setShowCategoryInput(false)} className="flex-1 bg-gray-100 text-gray-900 text-xs font-medium py-2 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
               </div>
             </form>
           ) : (
             <button 
               onClick={(e) => {
                 e.stopPropagation();
                 setShowCategoryInput(true);
               }}
               className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-100 rounded-lg text-black font-medium flex items-center gap-2"
             >
               <Plus size={14} />
               Create New
             </button>
           )}
        </div>
      </div>

      <div className="h-[1px] bg-gray-100 my-1" />

      <button 
        onClick={onDelete}
        className="w-full text-left px-3 py-2.5 text-sm hover:bg-red-50 text-red-600 rounded-lg flex items-center gap-2 transition-colors font-medium"
      >
        <Trash2 size={14} />
        Delete Memory
      </button>
    </div>
  );
}

