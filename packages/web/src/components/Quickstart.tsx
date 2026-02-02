"use client";

import { motion } from "framer-motion";

export function Quickstart() {
  const steps = [
    { label: "Install", cmd: "curl -sS https://memories.sh/install | sh" },
    { label: "Init", cmd: "memories init" },
    { label: "Add memory", cmd: "memories add 'Use Tailwind for all UI components'" },
    { label: "Query", cmd: "memories query 'styling preferences'" }
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <section id="quickstart" className="py-32 px-6 ">
      <div className="max-w-4xl mx-auto">
        <div className="mb-24 flex flex-col items-center text-center">
          <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-primary mb-4">Implementation</div>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tighter text-white">Initialize Protocol</h2>
        </div>

        <div className="bg-white/[0.02] border border-white/5 overflow-hidden relative group mb-16">
          <div className="flex items-center gap-2 px-6 py-4 bg-white/5 border-b border-white/5">
            <div className="flex gap-1.5">
              <div className="w-1.5 h-1.5 bg-primary/40" />
              <div className="w-1.5 h-1.5 bg-primary/40" />
              <div className="w-1.5 h-1.5 bg-primary/40" />
            </div>
            <span className="text-[9px] text-muted-foreground/40 font-mono uppercase tracking-[0.2em] ml-4 font-bold">memories-sh // bash</span>
          </div>
          <div className="p-10 font-mono text-sm space-y-10 relative z-10">
            {steps.map((step, idx) => (
              <div key={idx} className="group/item relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-primary/40 text-[9px] uppercase tracking-[0.2em] font-bold">{step.label}</span>
                  <button 
                    onClick={() => copyToClipboard(step.cmd)}
                    className="opacity-0 group-hover/item:opacity-100 transition-opacity p-1 hover:text-primary"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                </div>
                <div className="flex gap-6">
                  <span className="text-primary/40 selection:bg-transparent">→</span>
                  <span className="text-foreground/80 font-light">{step.cmd}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-10 bg-white/[0.01] border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-px h-full bg-primary/20" />
          <div className="flex items-start gap-6">
            <div className="mt-1 w-1.5 h-1.5 rounded-full bg-primary" />
            <div>
              <h4 className="text-sm font-bold mb-4 tracking-[0.1em] text-white uppercase">Context Propagation</h4>
              <p className="text-[13px] text-muted-foreground leading-relaxed font-light">
                Memories are stored in two distinct layers. <span className="text-primary/90">Global Scope</span> persists your personal preferences and cross-project knowledge across all tools. <span className="text-primary/90">Project Scope</span> is bound to your current repository, ensuring that agent context remains relevant to the specific codebase and team rules.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
