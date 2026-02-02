"use client";

import { motion } from "framer-motion";

const FeatureIcon = ({ index }: { index: number }) => {
  const icons = [
    // Tool-agnostic
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10h16M4 14h16M9 6v12M15 6v12" />
    </svg>,
    // Universal context
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M2 12h20M7 7l10 10M17 7L7 17" />
    </svg>,
    // Scopes
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
    </svg>,
    // Fast recall
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
      <path d="M11 7v4l2 2" />
    </svg>,
    // Export/Import
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  ];
  return icons[index % icons.length];
};

export function FeaturesGrid() {
  const features = [
    {
      title: "Tool-agnostic configs",
      detail: "Define once, use across OpenCode, Claude Code, and Codex.",
      metric: "YAML v2.1"
    },
    {
      title: "Universal context",
      detail: "Hybrid vector stores optimized for high-speed retrieval.",
      metric: "Sub-100ms"
    },
    {
      title: "Scoped permissions",
      detail: "Isolate project memory from global preferences.",
      metric: "RBAC ready"
    },
    {
      title: "Fast recall search",
      detail: "Intelligent ranking based on active tool context.",
      metric: "99.9% Acc"
    },
    {
      title: "Zero lock-in export",
      detail: "Export your entire context to standard JSON/YAML.",
      metric: "Open Std"
    }
  ];

    return (
      <section id="features" className="py-32 px-6 ">
        <div className="max-w-6xl mx-auto">
          <div className="mb-24 flex flex-col items-center text-center">
            <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-primary mb-4">Core Infrastructure</div>
            <h2 className="text-4xl md:text-6xl font-bold tracking-tighter text-foreground">Engineered for momentum</h2>
          </div>
  
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-1">
            {features.map((f, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className="group p-10 bg-card/10 border border-border hover:bg-card/20 transition-all duration-500 relative overflow-hidden"
              >
                <div className="text-primary/40 group-hover:text-primary transition-colors duration-500 mb-10">
                  <FeatureIcon index={idx} />
                </div>
                
                <h4 className="text-lg font-bold mb-4 tracking-tight text-foreground">{f.title}</h4>
                <p className="text-[13px] text-muted-foreground leading-relaxed font-light mb-8">
                  {f.detail}
                </p>
                
                <div className="flex items-center gap-2 pt-6 border-t border-border">
                  <div className="w-1 h-1 rounded-full bg-primary/40" />
                  <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-muted-foreground/60">{f.metric}</span>
                </div>
  
                {/* Technical Hover Decor */}
                <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                  <div className="absolute top-4 right-4 w-2 h-2 border-t border-r border-primary/40" />
                </div>
              </motion.div>
            ))}
            
            <div className="p-10 bg-primary/5 border border-primary/10 flex flex-col justify-between group">
              <div>
                <div className="w-6 h-6 border border-primary/40 rounded-full flex items-center justify-center mb-10">
                  <div className="w-1 h-1 bg-primary animate-pulse" />
                </div>
                <h4 className="text-lg font-bold tracking-tight text-foreground mb-2">Custom Adapters</h4>
                <p className="text-[13px] text-muted-foreground leading-relaxed font-light">
                  Need a specific integration? We're building the future of agent memory together.
                </p>
              </div>
              <button className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary group-hover:translate-x-1 transition-transform inline-flex items-center gap-2 mt-10">
                Apply for Beta <span className="text-lg">→</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    );
}
