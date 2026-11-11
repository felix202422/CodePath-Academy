import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'codepath-academy:favorite-course-slugs';

function readFavoriteSlugs(): string[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(stored)) return [];
    return [...new Set(stored.filter((value): value is string => typeof value === 'string'))];
  } catch {
    return [];
  }
}

/** Browser-local favorites; no enrollment or account data is implied. */
export function useFavoriteCourses() {
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>(readFavoriteSlugs);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favoriteSlugs));
    } catch {
      // The in-memory favorite still works when browser storage is unavailable.
    }
  }, [favoriteSlugs]);

  useEffect(() => {
    function syncFavorites(event: StorageEvent) {
      if (event.key === STORAGE_KEY || event.key === null) {
        setFavoriteSlugs(readFavoriteSlugs());
      }
    }

    window.addEventListener('storage', syncFavorites);
    return () => window.removeEventListener('storage', syncFavorites);
  }, []);

  const toggleFavorite = useCallback((slug: string) => {
    setFavoriteSlugs((current) =>
      current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug],
    );
  }, []);

  const isFavorite = useCallback(
    (slug: string) => favoriteSlugs.includes(slug),
    [favoriteSlugs],
  );

  return { favoriteSlugs, isFavorite, toggleFavorite };
}
