import { Memory } from '@/lib/supabase';

// Preprocess memory to determine type and dimensions
export function processMemory(memory: Memory) {
  let type = 'memory-node';
  let width = 300; // Default width
  let height = 300; // Default height estimate

  if (memory.type === 'link') {
    type = 'link-node';
    height = 280; // Approx height for link node
  } else if (memory.type === 'image') {
    if (memory.assets && memory.assets.length > 1) {
      type = 'multi-image-node';
    } else {
      type = 'image-node';
    }
    height = 300;
  } else if (memory.content && memory.content.startsWith('http') && !memory.content.includes(' ') && memory.content.length < 500) {
    type = 'link-node';
    height = 280;
  } else if (memory.content && memory.content.indexOf('\n') !== -1 && memory.content.substring(0, memory.content.indexOf('\n')).startsWith('http')) {
    // Check if content matches the format "URL\nDescription" which we use for links
    type = 'link-node';
    height = 280;
  } else if (memory.assets && memory.assets.length > 0 && (!memory.content || memory.content.trim() === '')) {
    if (memory.assets.length > 1) {
      type = 'multi-image-node';
    } else {
      type = 'image-node';
    }
    height = 300;
  } else {
    // Memory node
    type = 'memory-node';
    width = 290;
    height = 200;
  }

  // Prepare data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {
      label: memory.title,
      content: memory.content,
      images: memory.assets || [],
      category: memory.category,
  };

  if (type === 'link-node') {
    const firstLineEnd = memory.content.indexOf('\n');
    if (firstLineEnd !== -1) {
      data.url = memory.content.substring(0, firstLineEnd);
      data.content = memory.content.substring(firstLineEnd + 1);
    } else {
      data.url = memory.content;
      data.content = '';
    }
  } else if (type === 'image-node') {
    data.src = memory.assets?.[0] || '';
    data.alt = memory.title;
    data.width = 300;
    data.height = 300;
  } else if (type === 'multi-image-node') {
    data.images = memory.assets || [];
  }

  return {
    ...memory,
    _type: type,
    _width: width,
    _height: height,
    _data: data
  };
}

