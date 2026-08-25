import { useAuth } from "@/_core/hooks/useAuth";
import EyeCore from "@/components/EyeCore";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowDown, ArrowRight, Check, ChevronRight, Eye, Fingerprint, LockKeyhole, MapPin, Menu, Radio, ScanLine, ShieldCheck, Sparkles, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

const steps = [
  { number: "01", title: "Create your room", copy: "Sign in and receive a private Eye code that belongs only to you." },
  { number: "02", title: "Find your person", copy: "Send a connection request. Nothing is shared until both sides accept." },
  { number: "03", title: "Choose visibility", copy: "Start, pause, or stop sharing your location whenever you want." },
  { number: "04", title: "Stay in sync", copy: "See presence, last update, and the distance between you in one calm view." },
];

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);
  const { data: connectionStatus } = trpc.connection.status.useQuery(undefined, { enabled: isAuthenticated, retry: false });

  const eyeState = connectionStatus?.sharing.enabled && !connectionStatus.sharing.paused
    ? "active"
    : connectionStatus?.connection?.status === "accepted"
      ? "connected"
      : "normal";

  useEffect(() => {
    if (connectionStatus?.connection?.updatedAt) setPulseKey(value => value + 1);
  }, [connectionStatus?.connection?.updatedAt]);

  const enterEye = () => {
    if (isAuthenticated) navigate("/app");
    else startLogin();
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#090714] text-white">
      <div className="pointer-events-none fixed inset-0 z-50 noise-overlay" />
      <div className="pointer-events-none fixed inset-0 z-40 scanlines" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[640px] bg-[radial-gradient(ellipse_at_50%_10%,rgba(118,57,204,.25),transparent_60%)]" />

      <header className="relative z-30 mx-auto flex max-w-[1320px] items-center justify-between px-5 py-6 sm:px-8 lg:px-12">
        <a href="#top" className="group flex items-center gap-3" aria-label="THE EYE home">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-violet-300/25 bg-violet-400/10 text-violet-100 shadow-[0_0_24px_rgba(167,90,255,.15)]"><Eye className="h-5 w-5" /></span>
          <span><span className="block font-[Space_Grotesk] text-base font-bold tracking-[0.22em]">THE EYE</span><span className="block font-[JetBrains_Mono] text-[9px] tracking-[0.22em] text-slate-500">A PRIVATE RELAY</span></span>
        </a>
        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary navigation">
          <a href="#how-it-works" className="font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.2em] text-slate-500 transition hover:text-white">How it works</a>
          <a href="#privacy" className="font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.2em] text-slate-500 transition hover:text-white">Privacy first</a>
          <button onClick={enterEye} className="glow-button rounded-lg border border-violet-200/20 bg-violet-400/10 px-4 py-2 font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.18em] text-violet-100 transition hover:bg-violet-300/20">{isAuthenticated ? "Open app" : "Sign in"}</button>
        </nav>
        <button className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-300 md:hidden" onClick={() => setMobileOpen(value => !value)} aria-label={mobileOpen ? "Close menu" : "Open menu"}>{mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
      </header>
      {mobileOpen && <div className="relative z-30 mx-5 rounded-2xl border border-white/10 bg-[#151126]/95 p-4 shadow-2xl backdrop-blur-xl md:hidden"><div className="flex flex-col gap-4"><a href="#how-it-works" onClick={() => setMobileOpen(false)} className="font-[JetBrains_Mono] text-xs uppercase tracking-[0.18em] text-slate-300">How it works</a><a href="#privacy" onClick={() => setMobileOpen(false)} className="font-[JetBrains_Mono] text-xs uppercase tracking-[0.18em] text-slate-300">Privacy first</a><button onClick={enterEye} className="rounded-lg bg-violet-500 px-4 py-3 text-left font-[JetBrains_Mono] text-xs uppercase tracking-[0.18em] text-white">{isAuthenticated ? "Open app" : "Sign in"}</button></div></div>}

      <main id="top" className="relative">
        <section className="relative mx-auto grid min-h-[780px] max-w-[1440px] items-center px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-[0.95fr_1.35fr] lg:gap-4 lg:px-12 lg:pb-28 lg:pt-0">
          <div className="relative z-10 order-2 max-w-xl pt-5 lg:order-1 lg:pt-0">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200/15 bg-emerald-300/[0.05] px-3 py-2"><span className="status-dot" /><span className="font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.17em] text-emerald-100/75">Consent-first / always visible</span></div>
            <p className="eyebrow mb-5 text-violet-200/70">A quieter way to stay close</p>
            <h1 className="max-w-[680px] font-[Space_Grotesk] text-5xl font-semibold leading-[0.95] tracking-[-0.06em] text-white sm:text-7xl lg:text-[clamp(4rem,6.5vw,6.7rem)]">See where they are.<br /><span className="bg-gradient-to-r from-violet-100 via-fuchsia-200 to-cyan-200 bg-clip-text text-transparent">Stay connected.</span></h1>
            <p className="mt-7 max-w-md text-base leading-7 text-slate-400 sm:text-lg">A private location-sharing experience for two people who want to feel close, without giving up control.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row"><button onClick={enterEye} className="glow-button group inline-flex h-13 items-center justify-center gap-3 rounded-xl bg-violet-500 px-6 font-[JetBrains_Mono] text-xs font-semibold uppercase tracking-[0.16em] text-white hover:bg-violet-400">{isAuthenticated ? "Open your room" : "Enter the Eye"}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></button><a href="#how-it-works" className="inline-flex h-13 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-6 font-[JetBrains_Mono] text-xs uppercase tracking-[0.16em] text-slate-300 transition hover:border-violet-200/30 hover:bg-white/[0.06]">How it works <ArrowDown className="h-4 w-4" /></a></div>
            <div className="mt-10 flex flex-wrap gap-x-5 gap-y-3 text-[11px] text-slate-500"><span className="inline-flex items-center gap-2"><LockKeyhole className="h-3.5 w-3.5 text-violet-300/70" /> No secret tracking</span><span className="inline-flex items-center gap-2"><Fingerprint className="h-3.5 w-3.5 text-cyan-300/70" /> You own your visibility</span></div>
          </div>
          <div className="order-1 flex min-h-[340px] items-center justify-center lg:order-2 lg:min-h-[700px]"><div className="relative w-full max-w-[740px]"><div className="hairline-grid pointer-events-none absolute inset-0 opacity-60" /><div className="absolute left-[7%] top-[15%] font-[JetBrains_Mono] text-[10px] tracking-[0.28em] text-cyan-200/40 floating-symbol">光 / 01</div><div className="absolute right-[8%] top-[28%] font-[JetBrains_Mono] text-[10px] tracking-[0.28em] text-violet-200/40 floating-symbol">監視</div><div className="absolute bottom-[17%] left-[12%] font-[JetBrains_Mono] text-[10px] tracking-[0.28em] text-rose-200/30 floating-symbol">接続</div><EyeCore state={eyeState} pulseKey={pulseKey} /><div className="mt-1 flex items-center justify-center gap-3 font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.23em] text-slate-500"><ScanLine className="h-3.5 w-3.5 text-cyan-300/60" /> {eyeState === "active" ? "The Eye is watching" : eyeState === "connected" ? "Connection established" : "Awaiting your person"}</div></div></div>
          <div className="pointer-events-none absolute bottom-0 left-1/2 h-px w-4/5 -translate-x-1/2 bg-gradient-to-r from-transparent via-violet-300/35 to-transparent" />
        </section>

        <section id="how-it-works" className="relative border-y border-white/[0.07] bg-[#0d0a1c]/75 py-24 sm:py-32"><div className="container"><div className="grid gap-12 lg:grid-cols-[0.8fr_1.8fr]"><div><p className="eyebrow mb-4 text-cyan-200/70">The ritual</p><h2 className="font-[Space_Grotesk] text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Connection,<br /><span className="text-violet-200">with intention.</span></h2><p className="mt-6 max-w-sm text-sm leading-7 text-slate-500">There is no ambient feed, no audience, and no hidden map. Just one private channel you open together.</p></div><div className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2">{steps.map(step => <article key={step.number} className="group bg-[#100d21] p-6 transition hover:bg-[#17112d] sm:p-8"><div className="flex items-center justify-between"><span className="font-[JetBrains_Mono] text-xs text-violet-300/70">{step.number}</span><ChevronRight className="h-4 w-4 text-slate-700 transition group-hover:translate-x-1 group-hover:text-violet-200" /></div><h3 className="mt-12 font-[Space_Grotesk] text-xl font-medium text-white">{step.title}</h3><p className="mt-3 text-sm leading-6 text-slate-500">{step.copy}</p></article>)}</div></div></div></section>

        <section id="privacy" className="relative mx-auto max-w-[1320px] px-5 py-24 sm:px-8 sm:py-32 lg:px-12"><div className="grid items-center gap-14 lg:grid-cols-[1.1fr_.9fr]"><div className="relative overflow-hidden rounded-[28px] border border-violet-200/15 bg-[radial-gradient(circle_at_50%_30%,rgba(104,61,194,.28),transparent_52%),#100c21] p-8 sm:p-12"><div className="absolute inset-0 hairline-grid opacity-50" /><div className="relative"><div className="mb-10 flex items-center justify-between"><p className="eyebrow text-violet-200/70">The connection</p><Radio className="h-5 w-5 text-cyan-200/70" /></div><div className="flex items-center justify-center gap-4 sm:gap-12"><div className="grid h-20 w-20 place-items-center rounded-full border border-cyan-200/30 bg-cyan-300/10 shadow-[0_0_42px_rgba(60,211,255,.25)] sm:h-28 sm:w-28"><Eye className="h-8 w-8 text-cyan-200 sm:h-11 sm:w-11" /></div><div className="relative h-px flex-1 bg-gradient-to-r from-cyan-300/70 via-violet-300/80 to-fuchsia-300/70"><span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_18px_6px_rgba(202,141,255,.75)]" /></div><div className="grid h-20 w-20 place-items-center rounded-full border border-fuchsia-200/30 bg-fuchsia-300/10 shadow-[0_0_42px_rgba(211,100,255,.25)] sm:h-28 sm:w-28"><Eye className="h-8 w-8 text-fuchsia-200 sm:h-11 sm:w-11" /></div></div><div className="mt-12 flex items-center justify-between font-[JetBrains_Mono] text-[9px] uppercase tracking-[0.18em] text-slate-500"><span>your eye</span><span>consent required</span><span>their eye</span></div></div></div><div><p className="eyebrow mb-4 text-emerald-200/70">Privacy first</p><h2 className="font-[Space_Grotesk] text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Your location<br /><span className="text-emerald-200">belongs to you.</span></h2><p className="mt-7 max-w-md text-base leading-8 text-slate-400">THE EYE never turns on a hidden mode. Sharing begins only after you choose it, and every active state is made visible in the room.</p><div className="mt-8 space-y-4">{["Both people accept before a connection becomes active.", "Start, pause, or stop sharing in one tap.", "Exact location is a choice, not a default.", "Location updates are only visible to your connected person."].map(item => <div key={item} className="flex items-start gap-3 text-sm text-slate-300"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-emerald-200/20 bg-emerald-300/10 text-emerald-200"><Check className="h-3 w-3" /></span>{item}</div>)}</div></div></div></section>

        <section className="relative border-t border-white/[0.07] bg-[#0d0a1c] py-28 sm:py-36"><div className="container text-center"><p className="eyebrow mb-5 text-violet-200/70">Your private channel awaits</p><h2 className="mx-auto max-w-2xl font-[Space_Grotesk] text-5xl font-semibold tracking-[-0.06em] sm:text-7xl">Ready to open<br /><span className="bg-gradient-to-r from-violet-100 to-cyan-200 bg-clip-text text-transparent">the Eye?</span></h2><p className="mx-auto mt-6 max-w-md text-sm leading-7 text-slate-500">Create a connection that feels close without asking for more than you choose to give.</p><button onClick={enterEye} className="glow-button group mt-9 inline-flex h-13 items-center gap-3 rounded-xl bg-violet-500 px-7 font-[JetBrains_Mono] text-xs font-semibold uppercase tracking-[0.18em] text-white hover:bg-violet-400">{isAuthenticated ? "Enter your room" : "Enter the Eye"}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></button></div></section>
      </main>
      <footer className="border-t border-white/[0.07] px-5 py-7 sm:px-8 lg:px-12"><div className="mx-auto flex max-w-[1320px] flex-col gap-3 text-[10px] text-slate-600 sm:flex-row sm:items-center sm:justify-between"><span className="font-[JetBrains_Mono] uppercase tracking-[0.2em]">THE EYE / Private connection for two</span><span className="inline-flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-emerald-300/60" /> Visibility is always yours</span></div></footer>
    </div>
  );
}
