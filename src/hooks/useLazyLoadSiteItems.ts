import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "../integrations/supabase/client";
import { SiteItem, Item } from "../types";

export type SiteItemWithItem = SiteItem & { item: Item };

export function useLazyLoadSiteItems(siteId: string) {
  const [items, setItems] = useState<SiteItemWithItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadItems = useCallback(async () => {
    if (loaded || loading) return;
    
    setLoading(true);
    const { data } = await supabase
      .from("site_items")
      .select("*, item:items(*)")
      .eq("site_id", siteId);
    
    setItems((data || []) as SiteItemWithItem[]);
    setLoaded(true);
    setLoading(false);
  }, [siteId, loaded, loading]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loaded) {
          loadItems();
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [loadItems, loaded]);

  return { items, loading, loaded, containerRef };
}
