import React, { useState } from 'react';
import { ExternalLink, Globe, Loader2, MapPin, TrendingDown } from 'lucide-react';
import { CITY_HUB_CENTERS } from '../data/zevroData';

interface GroundingLink {
  title: string;
  uri: string;
}

interface MapPlace {
  title: string;
  uri: string;
  reviewSnippets: string[];
}

interface MarketGroundingPanelProps {
  selectedCity: string;
  defaultQuery?: string;
}

export const MarketGroundingPanel: React.FC<MarketGroundingPanelProps> = ({
  selectedCity,
  defaultQuery = 'Warehouse Picker & Packer / Home Electrician daily rate',
}) => {
  const [queryText, setQueryText] = useState(defaultQuery);
  const [loadingMode, setLoadingMode] = useState<'search' | 'maps' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchResult, setSearchResult] = useState<{
    summary: string;
    groundingLinks: GroundingLink[];
  } | null>(null);
  const [mapsResult, setMapsResult] = useState<{
    summary: string;
    mapPlaces: MapPlace[];
  } | null>(null);

  const handleCheckMarketRates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryText.trim()) return;
    setLoadingMode('search');
    setErrorMsg('');
    try {
      const res = await fetch('/api/market-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText.trim(), city: selectedCity }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not retrieve market rate data.');
      }
      setSearchResult({
        summary: data.summary,
        groundingLinks: Array.isArray(data.groundingLinks) ? data.groundingLinks : [],
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Market rate lookup failed.');
    } finally {
      setLoadingMode(null);
    }
  };

  const handleFindNearbyHubs = async () => {
    const searchTerm = queryText.trim() || 'Service Hubs & Training Centers';
    setLoadingMode('maps');
    setErrorMsg('');

    const fallback =
      CITY_HUB_CENTERS[selectedCity]?.hub ?? CITY_HUB_CENTERS['Bengaluru · Indiranagar'].hub;

    let coords = { latitude: fallback.lat, longitude: fallback.lng };
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 2500 });
        });
        coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
      } catch {
        // Fallback to active city dispatch hub coordinates
      }
    }

    try {
      const res = await fetch('/api/nearby-hubs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchTerm,
          city: selectedCity,
          latitude: coords.latitude,
          longitude: coords.longitude,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not retrieve nearby Maps locations.');
      }
      setMapsResult({
        summary: data.summary,
        mapPlaces: Array.isArray(data.mapPlaces) ? data.mapPlaces : [],
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Nearby hubs lookup failed.');
    } finally {
      setLoadingMode(null);
    }
  };

  return (
    <section
      aria-label="Live Indian Market Rates and Nearby Hubs"
      className="mt-8 rounded-2xl border border-[#e4e4e7] bg-white p-5 sm:p-6"
    >
      <div className="flex flex-col gap-3 border-b border-[#e4e4e7] pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-bold tracking-[0.06em] text-[#059669] uppercase">
            <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Real Market Rates · Reduced 5% Shift GST</span>
          </p>
          <h2 className="font-display mt-1 text-lg font-extrabold text-[#18181b]">
            Verify Live Market Wages &amp; Nearby Service Hubs ({selectedCity})
          </h2>
          <p className="mt-0.5 text-xs text-[#52525b]">
            Every ZEVRO shift is benchmarked against live 2026 Indian metro market rates with GST lowered from 18% to 5% on shifts and 0% deducted from worker take-home.
          </p>
        </div>

        <div className="rounded-xl border border-[#a7f3d0] bg-[#ecfdf5] px-4 py-2.5 text-xs font-semibold text-[#047857] shrink-0">
          <span>Shift GST Cut: 18% → 5% (Saves ₹130+ per ₹1,000 shift)</span>
        </div>
      </div>

      <form onSubmit={handleCheckMarketRates} className="mt-4 flex flex-col gap-2.5 sm:flex-row">
        <label htmlFor="grounding-rate-query" className="sr-only">
          Service or shift role to check market rate and nearby hubs
        </label>
        <input
          id="grounding-rate-query"
          type="text"
          value={queryText}
          onChange={(e) => setQueryText(e.target.value)}
          placeholder="e.g., Swimming coach, Warehouse picker, AC technician, Home cook..."
          className="h-10 flex-1 rounded-xl border-[1.5px] border-[#e4e4e7] bg-[#fcfbfa] px-3.5 text-sm text-[#18181b] placeholder:text-[#71717a] focus:border-[#e23744] focus:bg-white focus:outline-none"
        />
        <button
          type="submit"
          disabled={loadingMode !== null}
          className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl bg-[#18181b] px-4 py-2 text-xs font-bold text-white hover:bg-[#27272a] disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
        >
          {loadingMode === 'search' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Globe className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span>Check Live Market Rate</span>
        </button>
        <button
          type="button"
          disabled={loadingMode !== null}
          onClick={handleFindNearbyHubs}
          className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border border-[#e4e4e7] bg-[#fcfbfa] px-4 py-2 text-xs font-bold text-[#18181b] hover:bg-[#f4f4f5] disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
        >
          {loadingMode === 'maps' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <MapPin className="h-3.5 w-3.5 text-[#e23744]" aria-hidden="true" />
          )}
          <span>Find Nearby Hubs (Maps)</span>
        </button>
      </form>

      {errorMsg && (
        <p className="mt-3 rounded-lg border border-[#fecdd3] bg-[#fff1f2] px-3 py-2 text-xs font-semibold text-[#be123c]">
          {errorMsg}
        </p>
      )}

      {(searchResult || mapsResult) && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {searchResult && (
            <div className="rounded-xl border border-[#e4e4e7] bg-[#fcfbfa] p-4">
              <p className="text-xs font-bold tracking-[0.04em] text-[#18181b] uppercase">
                Live Search Market Rate Benchmark
              </p>
              <div className="mt-2 whitespace-pre-line text-xs leading-[1.6] text-[#3f3f46]">
                {searchResult.summary}
              </div>
              {searchResult.groundingLinks.length > 0 && (
                <div className="mt-3 border-t border-[#e4e4e7] pt-2.5">
                  <p className="text-[11px] font-semibold text-[#71717a]">
                    Market Sources:
                  </p>
                  <ul className="mt-1.5 flex flex-wrap gap-2">
                    {searchResult.groundingLinks.slice(0, 4).map((link) => (
                      <li key={link.uri}>
                        <a
                          href={link.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-[#e4e4e7] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#18181b] hover:border-[#e23744] hover:text-[#e23744]"
                        >
                          <span className="max-w-[180px] truncate">{link.title}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {mapsResult && (
            <div className="rounded-xl border border-[#e4e4e7] bg-[#fcfbfa] p-4">
              <p className="text-xs font-bold tracking-[0.04em] text-[#e23744] uppercase">
                Google Maps Nearby Hubs &amp; Venues
              </p>
              <div className="mt-2 whitespace-pre-line text-xs leading-[1.6] text-[#3f3f46]">
                {mapsResult.summary}
              </div>
              {mapsResult.mapPlaces.length > 0 && (
                <div className="mt-3 border-t border-[#e4e4e7] pt-2.5">
                  <p className="text-[11px] font-semibold text-[#71717a]">
                    Verified Google Maps Locations:
                  </p>
                  <ul className="mt-1.5 space-y-2">
                    {mapsResult.mapPlaces.slice(0, 5).map((place) => (
                      <li
                        key={place.uri}
                        className="rounded-lg border border-[#e4e4e7] bg-white p-2.5"
                      >
                        <a
                          href={place.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#e23744] hover:underline"
                        >
                          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>{place.title}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                        </a>
                        {place.reviewSnippets.length > 0 && (
                          <p className="mt-1 text-[11px] text-[#52525b]">
                            &ldquo;{place.reviewSnippets[0]}&rdquo;
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
