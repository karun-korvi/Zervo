import React, { useState } from 'react';
import { LogIn, LogOut, Menu, X } from 'lucide-react';
import { ScreenId } from '../types/zevro';

interface NavbarProps {
  activeScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  onOpenPostModal: () => void;
  activeBookingCount: number;
  authUser: { displayName: string | null; email: string | null } | null;
  authLoading: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

const NAV_ITEMS: { id: ScreenId; label: string }[] = [
  { id: 'services', label: 'Services' },
  { id: 'pros', label: 'Book Pro' },
  { id: 'jobs', label: 'Find Work' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'earnings', label: 'Earnings' },
];

export const Navbar: React.FC<NavbarProps> = ({
  activeScreen,
  onNavigate,
  onOpenPostModal,
  activeBookingCount,
  authUser,
  authLoading,
  onSignIn,
  onSignOut,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (screen: ScreenId) => {
    onNavigate(screen);
    setMobileMenuOpen(false);
  };

  const firstName = authUser?.displayName?.split(/\s+/)[0] || authUser?.email?.split('@')[0] || 'Account';

  return (
    <header className="sticky top-0 z-40 border-b border-[#e4e4e7] bg-[#fcfbfa]/92 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleNavClick('services')}
          className="font-display text-left text-2xl font-extrabold tracking-[-0.04em] text-[#e23744] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e23744] rounded-sm cursor-pointer"
        >
          ZEVRO
        </button>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav
          aria-label="Primary"
          className="hidden md:flex items-center gap-7"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`relative py-2 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e23744] ${
                  isActive
                    ? 'text-[#18181b]'
                    : 'text-[#52525b] hover:text-[#18181b]'
                }`}
              >
                <span>{item.label}</span>
                {item.id === 'bookings' && activeBookingCount > 0 && (
                  <span className="ml-1.5 font-mono text-xs text-[#e23744] tabular-nums">
                    ({activeBookingCount})
                  </span>
                )}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[17px] h-0.5 bg-[#e23744]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Compact Google Auth + primary CTA button + mobile menu trigger */}
        <div className="flex items-center gap-2.5 shrink-0">
          {authUser ? (
            <button
              type="button"
              onClick={onSignOut}
              disabled={authLoading}
              title={`Signed in as ${authUser.email ?? firstName} — click to sign out`}
              className="hidden sm:inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#e4e4e7] bg-white px-3 py-2 text-xs font-semibold text-[#18181b] transition-colors hover:bg-[#f4f4f5] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span className="max-w-[90px] truncate">{firstName}</span>
              <LogOut className="h-3.5 w-3.5 text-[#71717a]" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              disabled={authLoading}
              className="hidden sm:inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#e4e4e7] bg-white px-3 py-2 text-xs font-semibold text-[#18181b] transition-colors hover:bg-[#f4f4f5] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogIn className="h-3.5 w-3.5 text-[#059669]" aria-hidden="true" />
              <span>{authLoading ? 'Signing in...' : 'Sign In'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenPostModal}
            className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-[#e23744] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#be123c] active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e23744]"
          >
            Post Request
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#e4e4e7] bg-white text-[#18181b] md:hidden cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e23744]"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-t border-[#e4e4e7] bg-white px-4 py-3 md:hidden">
          <nav aria-label="Mobile Navigation" className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = activeScreen === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`flex min-h-[44px] items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap ${
                    isActive
                      ? 'bg-[#fff1f2] text-[#be123c]'
                      : 'text-[#52525b] hover:bg-[#f4f4f5]'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.id === 'bookings' && activeBookingCount > 0 && (
                    <span className="font-mono text-xs text-[#e23744] tabular-nums">
                      {activeBookingCount} active
                    </span>
                  )}
                </button>
              );
            })}
            <div className="mt-2 border-t border-[#e4e4e7] pt-2">
              {authUser ? (
                <button
                  type="button"
                  onClick={() => {
                    onSignOut();
                    setMobileMenuOpen(false);
                  }}
                  className="flex min-h-[40px] w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-[#18181b] hover:bg-[#f4f4f5]"
                >
                  <span>Signed in as {firstName}</span>
                  <span className="text-[#e23744]">Sign Out</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onSignIn();
                    setMobileMenuOpen(false);
                  }}
                  className="flex min-h-[40px] w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-[#059669] hover:bg-[#ecfdf5]"
                >
                  <span>Sign in with Google to save orders &amp; shifts</span>
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
