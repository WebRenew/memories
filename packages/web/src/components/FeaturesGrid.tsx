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
      title: "8+ IDE targets",
      detail: "Generate native rule files for Cursor, Claude, Copilot, Windsurf, Cline, Roo, Gemini, and AGENTS.md.",
      metric: "One command"
    },
    {
      title: "Full-text search",
      detail: "FTS5-powered search with BM25 ranking and prefix matching for fast recall.",
      metric: "SQLite FTS5"
    },
    {
      title: "Global & project scopes",
      detail: "Isolate project memory from global preferences using automatic git remote detection.",
      metric: "Auto-scoped"
    },
    {
      title: "Memory types",
      detail: "Classify memories as rules, decisions, facts, or notes for structured retrieval.",
      metric: "4 types"
    },
    {
      title: "JSON/YAML export",
      detail: "Export and import your entire memory store in standard open formats.",
      metric: "Open format"
    }
  ];

    return (
      <section id="features" className="py-32 px-6 ">
        <div className="max-w-6xl mx-auto">
          <div className="mb-24 flex flex-col items-center text-center">
            <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-primary mb-4">Core Features</div>
            <h2 className="text-4xl md:text-6xl font-bold tracking-tighter text-foreground">Built for your workflow</h2>
          </div>
  
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-1">
            {features.map((f, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
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
                <h4 className="text-lg font-bold tracking-tight text-foreground mb-2">MCP Server</h4>
                <p className="text-[13px] text-muted-foreground leading-relaxed font-light">
                  Built-in Model Context Protocol server with 7 tools for direct agent integration.
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary inline-flex items-center gap-2 mt-10">
                memories serve
              </span>
            </div>
          </div>
        </div>
      </section>
    );
}
