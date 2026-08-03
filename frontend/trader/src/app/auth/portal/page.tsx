'use client';

/**
 * Login portal — the intermediate "how do you want to sign in?" screen
 * the landing-page Login button now points at. It reuses the exact
 * split-screen chrome of the sign-in page (FullScreenSignup), but the
 * right panel shows two choices instead of the credentials form:
 *   • Login with TuskaEx → the real /auth/login page.
 * (The MT5 option was removed 2026-07-21 per client request.)
 */

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

export default function LoginPortalPage() {
  return (
    <div className="min-h-screen flex items-center justify-center overflow-hidden bg-[#FAFAFA] p-4">
      <div className="w-full relative max-w-5xl rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-2xl ring-1 ring-black/5">
        {/* Decorative brand-red ball + blurred bands behind the left panel */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-t from-transparent to-black/60" />
          <div className="absolute -bottom-12 -left-8 w-60 h-60 bg-[#D60101] rounded-full opacity-90" />
          <div className="absolute -bottom-6 left-32 w-32 h-20 bg-white rounded-full opacity-90 blur-2xl" />
          <div className="absolute bottom-2 left-12 w-32 h-20 bg-white rounded-full opacity-70 blur-xl" />
        </div>

        {/* Left dark hero panel */}
        <div className="bg-black text-white p-8 md:p-12 md:w-1/2 relative overflow-hidden z-10 flex flex-col justify-between min-h-[20rem] md:min-h-[36rem]">
          {/* Brand artwork, filling the panel. It sits at the very bottom of
              this stacking context; the logo and headline below already carry
              `relative z-10`, so they stay above it. */}
          <Image
            src="/marketing/login_banner.png"
            alt=""
            aria-hidden="true"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 640px"
            className="object-cover"
          />
          {/* The artwork is bright red down its right edge and the headline
              runs across the bottom, so a scrim keeps that text legible
              whatever the crop does at a given viewport width. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/20"
          />
          <Link
            href="/"
            aria-label="TuskaEx home"
            className="inline-flex items-center self-start relative z-10 bg-white/95 rounded-lg px-3 py-1.5"
          >
            <Image
              src="/marketing/tuskaex-logo.png"
              alt="TuskaEx"
              width={220}
              height={48}
              priority
              className="h-8 w-auto"
            />
          </Link>
          {/* The drawn AuthPanelArt that used to fill this space is gone —
              real artwork replaced it, and stacking the two would read as
              clutter. Its sibling in full-screen-signup.tsx still draws it,
              so the two auth panels no longer match; give that one the same
              treatment when there is a shot for it. A spacer keeps the
              logo/headline split the drawn art used to hold open. */}
          <div className="hidden flex-1 md:block" />

          <h1 className="text-2xl md:text-3xl font-medium leading-tight tracking-tight relative z-10">
            A precision-engineered trading platform for serious investors.
          </h1>
        </div>

        {/* Right panel — pick a login method */}
        <div className="p-8 md:p-12 md:w-1/2 flex flex-col justify-center bg-white text-[#0A0A0A] relative z-20">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-wider text-[#D60101] font-semibold mb-3">
              Welcome back
            </p>
            <h2 className="text-3xl font-medium mb-2 tracking-tight">Sign in to your account</h2>
            <p className="text-[#5B5B5B]">
              Access your account on the TuskaEx platform.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {/* Login with TuskaEx → real sign-in page */}
            <Link
              href="/auth/login"
              className="group w-full bg-[#D60101] hover:bg-[#A30000] text-white font-medium py-3.5 px-4 rounded-lg transition-colors inline-flex items-center justify-between gap-2"
            >
              <span>Login with TuskaEx</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>

          </div>

          <div className="mt-8 text-center text-[#5B5B5B] text-sm">
            Don&apos;t have an account yet?{' '}
            <Link
              href="/auth/register"
              className="text-[#0A0A0A] font-medium underline underline-offset-2 hover:text-[#D60101]"
            >
              Create one
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
