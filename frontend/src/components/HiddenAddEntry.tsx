import { FormEvent, useState } from 'react';
import { SiteHeader } from '@/components/SiteHeader';
import { requestAddSite } from '@/hooks/useAddSite';

const normalizeInputUrl = (value: string) => {
  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
};

const ArrowRightIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

const GlobeIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3c2.8 3 4.2 6 4.2 9s-1.4 6-4.2 9c-2.8-3-4.2-6-4.2-9s1.4-6 4.2-9Z" />
  </svg>
);

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 3 5.5 5.6V11c0 4.2 2.5 8 6.5 10 4-2 6.5-5.8 6.5-10V5.6z" />
    <path d="m9.5 12 1.8 1.8 3.8-4.3" />
  </svg>
);

export function HiddenAddEntry() {
  const [url, setUrl] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedUrl = normalizeInputUrl(url);
    const trimmedSecretKey = secretKey.trim();

    if (!normalizedUrl) {
      setResult({ type: 'error', message: 'Enter a website URL to save.' });
      return;
    }

    if (!trimmedSecretKey) {
      setResult({ type: 'error', message: 'Enter the secret key.' });
      return;
    }

    setIsSubmitting(true);
    setResult(null);

    try {
      const data = await requestAddSite({ url: normalizedUrl }, trimmedSecretKey);
      setResult({ type: 'success', message: `Added: ${data.site.title}` });
      setUrl('');
    } catch (error) {
      setResult({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Unable to add the site right now. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setUrl('');
    setSecretKey('');
    setResult(null);

    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
      return;
    }

    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(90,79,241,0.16),_transparent_32%),linear-gradient(180deg,#f8fafc_0%,#eef2f6_48%,#f5f7f9_100%)] text-[#2c2f31]">
      <div className="pointer-events-none absolute left-[-8rem] top-24 h-64 w-64 rounded-full bg-[#4a40e0]/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-6rem] right-[-4rem] h-72 w-72 rounded-full bg-cyan-200/25 blur-3xl" />
      <SiteHeader />

      <main className="relative flex flex-1 items-center justify-center px-5 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-32">
        <div className="w-full max-w-[36rem]">
          <section className="overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/80 shadow-[0_32px_90px_-28px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/60 backdrop-blur-xl">
            <div className="border-b border-slate-200/70 bg-[linear-gradient(135deg,rgba(74,64,224,0.10),rgba(255,255,255,0.9),rgba(103,232,249,0.18))] px-6 py-8 sm:px-10 sm:py-10 md:px-14">
              <div className="inline-flex items-center rounded-full border border-white/80 bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4a40e0] shadow-sm">
                Private Entry
              </div>
            </div>

            <div className="px-6 py-8 sm:px-10 sm:py-10 md:px-14 md:py-12">
              <form
                className="space-y-7 sm:space-y-8"
                onSubmit={(event) => void handleSubmit(event)}
              >
                <div className="space-y-3">
                  <label
                    htmlFor="collection-url"
                    className="ml-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-[#747779]"
                  >
                    Website URL
                  </label>
                  <div className="group flex items-center gap-3 rounded-[1rem] border border-slate-200 bg-white px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition focus-within:border-[#4a40e0]/60 focus-within:ring-4 focus-within:ring-[#4a40e0]/8">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.75rem] bg-[#eef1ff] text-[#4a40e0] transition group-focus-within:bg-[#4a40e0] group-focus-within:text-white">
                      <GlobeIcon />
                    </div>
                    <input
                      id="collection-url"
                      type="text"
                      autoComplete="url"
                      spellCheck={false}
                      value={url}
                      onChange={(event) => setUrl(event.target.value)}
                      placeholder="https://example.com"
                      className="w-full border-0 bg-transparent py-2 text-base text-[#2c2f31] outline-none placeholder:text-slate-400 sm:text-lg"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label
                    htmlFor="secret-key"
                    className="ml-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-[#747779]"
                  >
                    Security Key
                  </label>
                  <div className="group flex items-center gap-3 rounded-[1rem] border border-slate-200 bg-white px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition focus-within:border-[#4a40e0]/60 focus-within:ring-4 focus-within:ring-[#4a40e0]/8">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.75rem] bg-slate-100 text-slate-600 transition group-focus-within:bg-slate-900 group-focus-within:text-white">
                      <ShieldIcon />
                    </div>
                    <input
                      id="secret-key"
                      type="password"
                      autoComplete="current-password"
                      value={secretKey}
                      onChange={(event) => setSecretKey(event.target.value)}
                      placeholder="••••••••"
                      className="w-full border-0 bg-transparent py-2 text-base text-[#2c2f31] outline-none placeholder:text-slate-400 sm:text-lg"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-1 sm:pt-2">
                  {result ? (
                    <div
                      className={`rounded-[0.95rem] border px-4 py-3.5 text-sm leading-6 shadow-sm ${
                        result.type === 'success'
                          ? 'border-emerald-200 bg-emerald-50/90 text-emerald-900'
                          : 'border-rose-200 bg-rose-50/90 text-rose-900'
                      }`}
                    >
                      {result.message}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex flex-1 items-center justify-center gap-3 rounded-[0.95rem] bg-[linear-gradient(135deg,#4a40e0,#5a4ff1)] px-6 py-4 text-sm font-bold uppercase tracking-[0.22em] text-[#f4f1ff] shadow-[0_18px_40px_-16px_rgba(74,64,224,0.55)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-18px_rgba(74,64,224,0.55)] disabled:translate-y-0 disabled:cursor-wait disabled:opacity-70 disabled:shadow-none"
                  >
                    <span>{isSubmitting ? 'Adding Site' : 'Add Site'}</span>
                    <ArrowRightIcon />
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="inline-flex items-center justify-center rounded-[0.95rem] border border-slate-200 bg-white px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 sm:min-w-40"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
