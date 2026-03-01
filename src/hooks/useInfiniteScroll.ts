import { useState, useEffect, useCallback, useRef } from 'react';

interface UseInfiniteScrollOptions<T> {
  items: T[];
  pageSize?: number;
}

export function useInfiniteScroll<T>({ items, pageSize = 20 }: UseInfiniteScrollOptions<T>) {
  const [displayedItems, setDisplayedItems] = useState<T[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Reset when items change
  useEffect(() => {
    setPage(1);
    setDisplayedItems(items.slice(0, pageSize));
    setHasMore(items.length > pageSize);
  }, [items, pageSize]);

  const loadMore = useCallback(() => {
    const nextPage = page + 1;
    const endIndex = nextPage * pageSize;
    
    setDisplayedItems(items.slice(0, endIndex));
    setPage(nextPage);
    setHasMore(endIndex < items.length);
  }, [page, pageSize, items]);

  const setLoadMoreTarget = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    loadMoreRef.current = node;

    if (node) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore) {
            loadMore();
          }
        },
        { threshold: 0.1, rootMargin: '100px' }
      );
      observerRef.current.observe(node);
    }
  }, [hasMore, loadMore]);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return {
    displayedItems,
    hasMore,
    setLoadMoreTarget,
    loadMore,
    totalCount: items.length,
    displayedCount: displayedItems.length,
  };
}
