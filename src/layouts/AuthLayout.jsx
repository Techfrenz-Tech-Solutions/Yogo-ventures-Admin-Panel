/**
 * layouts/AuthLayout.jsx — Login & MFA Wrapper Layout
 * Split-screen: decorative left panel + form right panel.
 */

import React from "react";
import logo from "../Assets/Image/Logo1-white.png";

const FEATURES = [
  "Real-time order & enquiry management",
  "Advanced analytics & reports",
  "Product & category management",
  "Invoice generation & export",
  "Secure MFA authentication",
];

const AuthLayout = ({ children }) => (
  <div className="min-h-screen flex bg-white dark:bg-primary-900">

    {/* ── Left Decorative Panel (hidden below lg) ──────────────────── */}
    <div className="hidden lg:flex lg:w-[45%] bg-gradient-coastal relative overflow-hidden flex-col items-center justify-center p-12">

      {/* Background decorations */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10" />
      <div className="absolute top-16 left-10 w-32 h-32 rounded-full bg-white/5 blur-xl" />
      <div className="absolute bottom-24 right-8 w-48 h-48 rounded-full bg-accent-200/10 blur-2xl" />

      {/* Content */}
      <div className="relative z-10 text-center text-white">

        {/* Logo icon */}
<div className="w-32 h-32 rounded-3xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center mx-auto mb-8">
  <img
    src={logo}
    alt="YoGo Ventures Logo"
    className="w-24 h-24 object-contain"
  />
</div>

        <h1 className="font-heading text-3xl font-bold mb-3 text-white">
          YoGo Ventures Admin Panel
        </h1>

        <p className="text-white/70 text-base leading-relaxed max-w-xs mx-auto font-body">
          Manage your store, track orders, and grow your business — all from
          one place.
        </p>

        {/* Feature list */}
        <ul className="mt-10 space-y-3 text-left max-w-xs mx-auto">
          {FEATURES.map((item) => (
            <li key={item} className="flex items-center gap-3 text-sm text-white/80">
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  viewBox="0 0 12 12"
                  aria-hidden="true"
                >
                  <path
                    d="M2 6L5 9L10 3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Footer credit */}
      <p className="absolute bottom-8 text-white/40 text-xs font-body">
        © {new Date().getFullYear()} YoGo Ventures Admin Dashboard
      </p>
    </div>

    {/* ── Right Form Panel ─────────────────────────────────────────── */}
    <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
      <div className="w-full max-w-md">

        {/* Mobile-only logo header */}
        <div className="flex items-center gap-3 mb-10 lg:hidden">
          <div className="w-9 h-9 rounded-xl bg-gradient-coastal flex items-center justify-center overflow-hidden">
            <img
              src={logo}
              alt="YoGo Ventures Logo"
              className="w-6 h-6 object-contain"
            />
          </div>
          <span className="font-heading text-xl font-bold text-primary-500">
            YoGo Ventures
          </span>
        </div>

        {children}
      </div>
    </div>

  </div>
);

export default AuthLayout;