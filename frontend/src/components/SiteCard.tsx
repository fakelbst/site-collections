import type { Site } from "@/types";

export function SiteCard({ site }: { site: Site }) {
  const hostname = (() => {
    try {
      return new URL(site.url).hostname;
    } catch {
      return site.url;
    }
  })();

  return (
    <a
      href={site.url}
      target="_blank"
      rel="noreferrer"
      className="group relative flex h-full flex-col rounded-[24px] bg-[#eef1f3] p-5 transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-[0_12px_40px_-5px_rgba(44,47,49,0.06)]"
    >
      <article className="flex h-full flex-col [content-visibility:auto]">
        <div className="relative mb-6 aspect-video overflow-hidden rounded-[12px] bg-[#dfe3e6]">
          <img
            src={site.screenshot || site.ogImage || 'https://placehold.co/1200x750?text=Bookmark'}
            alt={site.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-[#4a40e0]/20 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-[#4a40e0] shadow-xl">
              Visit Link
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 17 17 7" />
                <path d="M9 7h8v8" />
              </svg>
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col space-y-3">
          <div className="flex items-start justify-between gap-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4a40e0]">
              {site.category}
            </span>
            <span className="text-sm text-[#595c5e]">•</span>
          </div>

          <h2 className="text-xl font-extrabold tracking-[-0.03em] text-[#2c2f31] transition-colors group-hover:text-[#4a40e0]">
            {site.title}
          </h2>

          <p className="line-clamp-3 text-sm leading-relaxed text-[#595c5e]">
            {site.description || 'No description was returned for this site, but it is still worth saving.'}
          </p>

          <div className="mt-auto pt-2 text-[11px] uppercase tracking-[0.16em] text-[#9a9d9f]">
            <span className="truncate">{hostname}</span>
          </div>
        </div>
      </article>
    </a>
  );
}
