import React, { useEffect, useState } from 'react'
import { Logo } from './Logo'

/* ─── Brand tokens ───────────────────────────────────────────────────────────
   #0F0F0F  Primary Background
   #202020  Surface / Card
   #5DD62C  Primary Accent
   #337418  Secondary Accent
   #F8F8F8  Text / Neutral
──────────────────────────────────────────────────────────────────────────── */

const CSS = `
  @keyframes splashFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes splashFadeOut {
    from { opacity: 1; }
    to   { opacity: 0; }
  }
  @keyframes splashLogoUp {
    from { opacity: 0; transform: translateY(32px) scale(0.92); }
    to   { opacity: 1; transform: translateY(0)    scale(1);    }
  }
  @keyframes splashTagline {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  @keyframes splashBarFill {
    from { width: 0%; }
    to   { width: 100%; }
  }
  @keyframes splashBarGlow {
    0%,100% { box-shadow: 0 0 8px rgba(93,214,44,0.6),  0 0 20px rgba(93,214,44,0.3); }
    50%      { box-shadow: 0 0 16px rgba(93,214,44,0.9), 0 0 40px rgba(93,214,44,0.5); }
  }
  @keyframes splashDots {
    0%   { content: '';    }
    33%  { content: '.';   }
    66%  { content: '..';  }
    100% { content: '...'; }
  }
  @keyframes splashOrb1 {
    0%,100% { transform: translate(-50%, -50%) scale(1);    opacity: 0.7; }
    50%      { transform: translate(-50%, -50%) scale(1.15); opacity: 1;   }
  }
  @keyframes splashOrb2 {
    0%,100% { transform: translate(50%, 50%) scale(1);    opacity: 0.5; }
    50%      { transform: translate(50%, 50%) scale(1.2);  opacity: 0.8; }
  }
  @keyframes splashStarTwinkle {
    0%,100% { opacity: 0.15; }
    50%      { opacity: 0.55; }
  }
  @keyframes splashIconPulse {
    0%,100% { filter: drop-shadow(0 0 8px rgba(93,214,44,0.5));  }
    50%      { filter: drop-shadow(0 0 20px rgba(93,214,44,0.9)); }
  }
  @keyframes splashRingExpand {
    from { transform: scale(0.6); opacity: 0.8; }
    to   { transform: scale(2.2); opacity: 0;   }
  }

  /* ── Page ── */
  .sp-page {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #0F0F0F;
    overflow: hidden;
    font-family: 'Inter', system-ui, sans-serif;
    animation: splashFadeIn 0.4s ease both;
  }
  .sp-page.leaving {
    animation: splashFadeOut 0.6s ease both;
  }

  /* ── Dot grid ── */
  .sp-grid {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(circle, rgba(93,214,44,0.2) 1px, transparent 1px);
    background-size: 30px 30px;
    opacity: 0.18;
    pointer-events: none;
  }

  /* ── Ambient orbs ── */
  .sp-orb-tl {
    position: absolute;
    top: 0; left: 0;
    width: 480px; height: 480px;
    background: radial-gradient(circle, rgba(93,214,44,0.18) 0%, transparent 65%);
    transform: translate(-50%, -50%);
    pointer-events: none;
    filter: blur(8px);
    animation: splashOrb1 5s ease-in-out infinite;
  }
  .sp-orb-br {
    position: absolute;
    bottom: 0; right: 0;
    width: 420px; height: 420px;
    background: radial-gradient(circle, rgba(93,214,44,0.14) 0%, transparent 65%);
    transform: translate(50%, 50%);
    pointer-events: none;
    filter: blur(8px);
    animation: splashOrb2 6s ease-in-out infinite;
  }
  .sp-orb-center {
    position: absolute;
    bottom: -40px; left: 50%;
    transform: translateX(-50%);
    width: 500px; height: 200px;
    background: radial-gradient(ellipse, rgba(93,214,44,0.22) 0%, transparent 70%);
    pointer-events: none;
    filter: blur(24px);
  }

  /* ── Decorative arc rings ── */
  .sp-arc {
    position: absolute;
    border-radius: 50%;
    border: 1px solid rgba(93,214,44,0.12);
    pointer-events: none;
  }
  .sp-arc-1 { width: 340px; height: 340px; top: -80px; left: -80px; }
  .sp-arc-2 { width: 220px; height: 220px; bottom: 60px; right: -40px; }

  /* ── Content wrapper ── */
  .sp-content {
    position: relative;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
    width: 100%;
    max-width: 340px;
    padding: 0 24px;
  }

  /* ── Logo icon ── */
  .sp-icon-wrap {
    position: relative;
    width: 90px;
    height: 90px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
    animation: splashLogoUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.2s both;
  }
  .sp-icon-svg {
    animation: splashIconPulse 2.5s ease-in-out infinite;
  }
  /* Expanding ring */
  .sp-ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 1.5px solid rgba(93,214,44,0.5);
    animation: splashRingExpand 2.5s ease-out infinite;
  }
  .sp-ring-2 {
    animation-delay: 1.25s;
  }

  /* ── Brand name ── */
  .sp-brand {
    display: flex;
    align-items: baseline;
    gap: 2px;
    animation: splashLogoUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.35s both;
    margin-bottom: 10px;
  }
  .sp-brand-white {
    font-size: 36px;
    font-weight: 800;
    color: #F8F8F8;
    letter-spacing: -0.02em;
  }
  .sp-brand-green {
    font-size: 36px;
    font-weight: 800;
    color: #5DD62C;
    letter-spacing: -0.02em;
  }

  /* ── Tagline ── */
  .sp-tagline {
    font-size: 13px;
    letter-spacing: 0.22em;
    color: rgba(248,248,248,0.45);
    text-transform: uppercase;
    animation: splashTagline 0.6s ease 0.55s both;
    margin-bottom: 52px;
  }

  /* ── Progress bar ── */
  .sp-bar-wrap {
    width: 100%;
    animation: splashTagline 0.5s ease 0.7s both;
  }
  .sp-bar-track {
    width: 100%;
    height: 6px;
    background: rgba(93,214,44,0.12);
    border-radius: 99px;
    overflow: hidden;
    border: 1px solid rgba(93,214,44,0.18);
  }
  .sp-bar-fill {
    height: 100%;
    border-radius: 99px;
    background: linear-gradient(90deg, #337418 0%, #5DD62C 60%, #a3f07a 100%);
    animation:
      splashBarFill var(--bar-duration, 3.8s) cubic-bezier(0.4,0,0.2,1) 0.8s both,
      splashBarGlow 1.2s ease-in-out infinite;
  }

  /* ── Loading text ── */
  .sp-loading-text {
    margin-top: 14px;
    font-size: 13px;
    color: rgba(248,248,248,0.45);
    letter-spacing: 0.04em;
    text-align: center;
  }
  .sp-loading-text::after {
    content: '';
    display: inline-block;
    width: 1.5em;
    text-align: left;
    animation: splashDots 1.2s steps(4, end) infinite;
  }

  /* ── Version badge ── */
  .sp-version {
    position: absolute;
    bottom: 28px;
    font-size: 11px;
    color: rgba(248,248,248,0.2);
    letter-spacing: 0.08em;
  }

  @media (max-width: 380px) {
    .sp-brand-white, .sp-brand-green { font-size: 30px; }
    .sp-icon-wrap { width: 72px; height: 72px; }
  }
`

interface SplashScreenProps {
  onDone: () => void
  duration?: number   // ms — how long before calling onDone (default 4000)
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onDone,
  duration = 4000,
}) => {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    // Start fade-out 600ms before calling onDone so the transition is smooth
    const fadeTimer = setTimeout(() => setLeaving(true), duration - 600)
    const doneTimer = setTimeout(onDone, duration)
    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(doneTimer)
    }
  }, [duration, onDone])

  // bar fill duration = duration - 800ms (starts 0.8s in, ends just before fade)
  const barDuration = `${(duration - 800) / 1000}s`

  return (
    <>
      <style>{CSS}</style>

      <div className={`sp-page${leaving ? ' leaving' : ''}`}>
        {/* Dot grid */}
        <div className="sp-grid" />

        {/* Ambient orbs */}
        <div className="sp-orb-tl" />
        <div className="sp-orb-br" />
        <div className="sp-orb-center" />

        {/* Arc rings */}
        <div className="sp-arc sp-arc-1" />
        <div className="sp-arc sp-arc-2" />

        {/* ── Main content ── */}
        <div className="sp-content">

          {/* Logo icon */}
          <div className="sp-icon-wrap">
            <div className="sp-ring" />
            <div className="sp-ring sp-ring-2" />
            <Logo size={80} className="sp-icon-svg" />
          </div>

          {/* Brand name */}
          <div className="sp-brand">
            <span className="sp-brand-white">tardy</span>
            <span className="sp-brand-green">Devs</span>
          </div>

          {/* Tagline */}
          <p className="sp-tagline">Build · Ship · Repeat</p>

          {/* Progress bar */}
          <div className="sp-bar-wrap">
            <div className="sp-bar-track">
              <div
                className="sp-bar-fill"
                style={{ '--bar-duration': barDuration } as React.CSSProperties}
              />
            </div>
            <p className="sp-loading-text">Loading your workspace</p>
          </div>
        </div>

        {/* Version */}
        <span className="sp-version">tardyDevs v1.0</span>
      </div>
    </>
  )
}
