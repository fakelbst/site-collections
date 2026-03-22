import { startTransition, useDeferredValue, useState } from 'react';
import { CategoryFilter } from '@/components/CategoryFilter';
import { HiddenAddEntry } from '@/components/HiddenAddEntry';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteCard } from '@/components/SiteCard';
import { useSites } from '@/hooks/useSites';
import { type Site, type SiteFilter } from '@/types';

const INITIAL_VISIBLE_COUNT = 6;
const LOAD_MORE_COUNT = 3;
const HIDDEN_ENTRY_PATH = '/add';

const ALL_FILTER: SiteFilter = 'All';

const getFilters = (sites: Site[]): SiteFilter[] => {
  const categories = [...new Set(sites.map((site) => site.category.trim()).filter(Boolean))].sort();
  return [ALL_FILTER, ...categories];
};

const createCounts = (sites: Site[]) => {
  const counts: Record<string, number> = { [ALL_FILTER]: sites.length };

  for (const site of sites) {
    counts[site.category] = (counts[site.category] ?? 0) + 1;
  }

  return counts;
};

const matchesSearch = (site: Site, query: string) => {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [site.title, site.description, site.url, site.category].some((value) =>
    value.toLowerCase().includes(normalizedQuery),
  );
};

export default function App() {
  const pathname = typeof window === 'undefined' ? '/' : window.location.pathname.replace(/\/$/, '') || '/';

  if (pathname === HIDDEN_ENTRY_PATH) {
    return <HiddenAddEntry />;
  }

  return <CollectionHome />;
}

function CollectionHome() {
  const [activeFilter, setActiveFilter] = useState<SiteFilter>(ALL_FILTER);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const sitesQuery = useSites();
  const sites = useDeferredValue(sitesQuery.data ?? []);
  const filters = getFilters(sites);
  const counts = createCounts(sites);
  const filteredSites = sites.filter((site) => {
    const matchesCategory = activeFilter === ALL_FILTER || site.category === activeFilter;
    return matchesCategory && matchesSearch(site, searchQuery);
  });
  const visibleSites = filteredSites.slice(0, visibleCount);
  const hasMore = visibleCount < filteredSites.length;

  const handleFilterChange = (filter: SiteFilter) => {
    startTransition(() => {
      setActiveFilter(filter);
      setVisibleCount(INITIAL_VISIBLE_COUNT);
    });
  };

  const handleSearchChange = (value: string) => {
    startTransition(() => {
      setSearchQuery(value);
      setVisibleCount(INITIAL_VISIBLE_COUNT);
    });
  };

  return (
    <div className="min-h-screen bg-[#f5f7f9] text-[#2c2f31]">
      <SiteHeader />

      <main className="mx-auto max-w-screen-2xl px-4 pb-20 pt-24 sm:px-6">
        <section className="mb-12 space-y-8">
          <div className="relative max-w-2xl">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 text-[#595c5e]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="11" cy="11" r="6.25" />
                <path d="m16 16 4 4" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Search the collection..."
              className="w-full border-0 border-b border-[#d9dde0] bg-transparent py-4 pl-10 pr-4 text-lg text-[#2c2f31] outline-none transition focus:border-[#4a40e0]"
            />
          </div>

          <CategoryFilter
            filters={filters}
            activeFilter={activeFilter}
            counts={counts}
            onChange={handleFilterChange}
          />
        </section>

        <section className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {sitesQuery.isLoading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-[320px] rounded-[24px] bg-[#eef1f3] animate-pulse" />
              ))
            : visibleSites.map((site) => <SiteCard key={site.id} site={site} />)}
        </section>

        {!sitesQuery.isLoading && sitesQuery.isError ? (
          <div className="mt-12 rounded-[24px] bg-rose-50 p-8 text-center">
            <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-rose-900">
              Failed to load the collection
            </h2>
            <p className="mt-3 text-sm leading-7 text-rose-700">{sitesQuery.error.message}</p>
            <button
              type="button"
              onClick={() => void sitesQuery.refetch()}
              className="mt-5 rounded-full bg-rose-600 px-5 py-3 text-sm font-bold text-white"
            >
              Try Again
            </button>
          </div>
        ) : null}

        {!sitesQuery.isLoading && !sitesQuery.isError && filteredSites.length === 0 ? (
          <div className="mt-12 rounded-[24px] bg-[#eef1f3] p-10 text-center">
            <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-[#2c2f31]">
              No matching sites found
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#595c5e]">
              Try a different category or adjust your search to explore the collection again.
            </p>
          </div>
        ) : null}

        {!sitesQuery.isLoading && !sitesQuery.isError && filteredSites.length > 0 ? (
          <div className="mt-20 flex justify-center">
            <button
              type="button"
              disabled={!hasMore}
              onClick={() => setVisibleCount((current) => current + LOAD_MORE_COUNT)}
              className="inline-flex items-center gap-2 rounded-full bg-[#4a40e0] px-8 py-4 text-sm font-bold tracking-tight text-[#f4f1ff] shadow-lg shadow-indigo-200 transition-all hover:shadow-indigo-300 disabled:cursor-default disabled:bg-[#d1ccff] disabled:text-[#4037a0] disabled:shadow-none"
            >
              {hasMore ? 'Discover More' : 'No More Results'}
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="m7 10 5 5 5-5" />
              </svg>
            </button>
          </div>
        ) : null}
      </main>
    </div>
  );
}
