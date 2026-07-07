'use client';

import Link from 'next/link';
import { BookOpen, Video, Film, Settings, Heart } from 'lucide-react';

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[#08080f] text-white selection:bg-violet-600/30">
      {/* Navbar */}
      <header className="border-b border-white/[0.06] bg-[#0d0d14]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-violet-600 to-indigo-600">
              <span className="font-bold text-white text-sm">Z</span>
            </div>
            <span className="font-bold text-lg text-white">Zonvo Docs</span>
          </div>
          <Link
            href="/dashboard"
            className="text-xs font-semibold px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            Go to Dashboard →
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-16 text-center space-y-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white/80 to-white/50">
          Zonvo Knowledgebase & Help Guide
        </h1>
        <p className="text-white/40 text-sm max-w-xl mx-auto">
          Welcome to the operator docs. Learn how to launch Webinars, upload Semi-Live playback assets, configure R2 domains, and analyze registrant watch times.
        </p>
      </section>

      {/* Docs Grid */}
      <main className="max-w-4xl mx-auto px-6 pb-20 grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          {
            title: 'Create Webinars',
            icon: Video,
            desc: 'Setup both Fully Live broadcast sessions and pre-recorded Semi-Live timelines. Learn about scheduling, passwords, and registrant limits.',
          },
          {
            title: 'Semi-Live Uploads',
            icon: Film,
            desc: 'Upload high-resolution video segments directly to the R2 Storage bucket. Choose from existing files or upload new clips in Step 1 of the wizard.',
          },
          {
            title: 'Control Room Backstage',
            icon: Settings,
            desc: 'Manage live webinars. Mute camera feed, trigger polls, post top banner alerts, copy coupon offers, and trigger floating emoji reactions.',
          },
          {
            title: 'Analytics & Reports',
            icon: BookOpen,
            desc: 'Export participant register list, verify joining status, and download formatted watch times for all attendee sessions.',
          },
        ].map((item, idx) => (
          <div
            key={idx}
            className="p-6 rounded-2xl bg-[#0d0d14]/40 border border-white/[0.06] hover:border-violet-500/20 transition-all duration-200 space-y-3"
          >
            <div className="w-10 h-10 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <item.icon className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white/90 text-sm">{item.title}</h3>
            <p className="text-white/40 text-xs leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8 text-center text-xs text-white/20">
        <p className="flex items-center justify-center gap-1">
          Made with <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" /> by Zonvo Enterprise team
        </p>
      </footer>
    </div>
  );
}
