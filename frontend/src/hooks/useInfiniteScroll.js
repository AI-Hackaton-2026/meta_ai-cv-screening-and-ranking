import { useCallback, useEffect, useRef } from "react";

export function useInfiniteScroll({
  enabled,
  isLoading = false,
  onLoadMore,
  rootMargin = "180px",
}) {
  const observerRef = useRef(null);
  const enabledRef = useRef(enabled);
  const isLoadingRef = useRef(isLoading);
  const loadRequestedRef = useRef(false);
  const onLoadMoreRef = useRef(onLoadMore);

  useEffect(() => {
    enabledRef.current = enabled;
    isLoadingRef.current = isLoading;
    if (!isLoading) {
      loadRequestedRef.current = false;
    }
    onLoadMoreRef.current = onLoadMore;
  }, [enabled, isLoading, onLoadMore]);

  useEffect(() => {
    return () => observerRef.current?.disconnect();
  }, []);

  return useCallback(
    (node) => {
      observerRef.current?.disconnect();

      if (!node) {
        return;
      }

      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (
            entry?.isIntersecting &&
            enabledRef.current &&
            !isLoadingRef.current &&
            !loadRequestedRef.current
          ) {
            loadRequestedRef.current = true;
            Promise.resolve(onLoadMoreRef.current?.()).finally(() => {
              window.setTimeout(() => {
                loadRequestedRef.current = false;
              }, 150);
            });
          }
        },
        { rootMargin }
      );
      observerRef.current.observe(node);
    },
    [rootMargin]
  );
}
