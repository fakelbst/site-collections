import type { SiteFilter } from "@/types";

interface CategoryFilterProps {
  filters: SiteFilter[];
  activeFilter: SiteFilter;
  counts: Record<string, number>;
  onChange: (filter: SiteFilter) => void;
}

export function CategoryFilter({ filters, activeFilter, counts, onChange }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
      {filters.map((filter) => {
        const selected = filter === activeFilter;

        return (
          <button
            key={filter}
            type="button"
            onClick={() => onChange(filter)}
            className={[
              'relative py-1 text-sm font-medium transition-colors',
              selected
                ? 'font-semibold text-[#4a40e0] after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-[#4a40e0]'
                : 'text-[#595c5e] hover:text-[#4a40e0]',
            ].join(' ')}
          >
            <span>{filter}</span>
            {filter === 'All' ? null : (
              <span className="ml-1.5 text-[10px] opacity-60">{counts[filter] ?? 0}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
