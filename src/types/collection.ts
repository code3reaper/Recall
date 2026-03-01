export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

export interface MemoryCollection {
  id: string;
  memory_id: string;
  collection_id: string;
  user_id: string;
  added_at: string;
}

export const COLLECTION_COLORS = [
  { name: 'blue', value: 'hsl(221, 83%, 53%)' },
  { name: 'purple', value: 'hsl(262, 83%, 58%)' },
  { name: 'pink', value: 'hsl(330, 81%, 60%)' },
  { name: 'red', value: 'hsl(0, 84%, 60%)' },
  { name: 'orange', value: 'hsl(25, 95%, 53%)' },
  { name: 'yellow', value: 'hsl(48, 96%, 53%)' },
  { name: 'green', value: 'hsl(142, 71%, 45%)' },
  { name: 'teal', value: 'hsl(173, 80%, 40%)' },
] as const;

export const COLLECTION_ICONS = [
  'folder', 'star', 'heart', 'bookmark', 'briefcase', 
  'graduation-cap', 'lightbulb', 'music', 'camera', 'code'
] as const;
