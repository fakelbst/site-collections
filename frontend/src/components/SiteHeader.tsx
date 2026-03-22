interface SiteHeaderProps {
  href?: string;
}

export function SiteHeader({ href = '/' }: SiteHeaderProps) {
  return (
    <nav className="fixed top-0 z-50 w-full bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-6 sm:gap-8">
          <a href={href} className="text-base font-bold tracking-[-0.04em] text-slate-900 sm:text-xl">
            The Digital Curator
          </a>
        </div>
      </div>
      <div className="h-px w-full bg-slate-100" />
    </nav>
  );
}
