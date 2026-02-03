"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export function Integrations() {
  const adapters = [
    {
      name: "Claude Code",
      logo: "/logos/claude-code.svg",
      status: "Available",
      desc: "Generates CLAUDE.md for Anthropic's coding CLI.",
    },
    {
      name: "Cursor",
      logo: "/logos/cursor.svg",
      status: "Available",
      desc: "Generates .cursor/rules/memories.mdc with frontmatter.",
    },
    {
      name: "GitHub Copilot",
      logo: "/logos/copilot.svg",
      status: "Available",
      desc: "Generates .github/copilot-instructions.md.",
    },
    {
      name: "Windsurf",
      logo: "/logos/windsurf.svg",
      status: "Available",
      desc: "Generates .windsurf/rules/memories.md.",
    },
    {
      name: "Gemini",
      logo: "/logos/gemini.svg",
      status: "Available",
      desc: "Generates GEMINI.md for Google's coding agent.",
    },
    {
      name: "Any MCP Client",
      logo: null,
      status: "Available",
      desc: "Built-in MCP server for direct agent access.",
    }
  ];

    return (
      <section id="integrations" className="py-32 px-6 bg-card/5">
        <div className="max-w-6xl mx-auto">
          <div className="mb-24 flex flex-col items-center text-center">
            <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-primary mb-4">Integrations</div>
            <h2 className="text-4xl md:text-6xl font-bold tracking-tighter text-foreground">Works With Your Tools</h2>
          </div>
  
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-1">
            {adapters.map((a, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="p-10 border border-border bg-card/10 flex flex-col items-start group hover:bg-card/20 transition-all"
              >
                <div className="flex items-center justify-between w-full mb-12">
                  <div className="w-8 h-8 flex items-center justify-center opacity-60 group-hover:opacity-100 transition-opacity duration-500">
                    {a.logo ? (
                      <Image src={a.logo} alt={a.name} width={32} height={32} />
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                        <path d="M4 17l6-6-6-6M12 19h8" />
                      </svg>
                    )}
                  </div>
                  <span className="text-[8px] font-bold uppercase tracking-[0.2em] px-2 py-0.5 border border-border text-muted-foreground">
                    {a.status}
                  </span>
                </div>
                
                <h4 className="text-lg font-bold mb-3 tracking-tight text-foreground">{a.name}</h4>
                <p className="text-[13px] text-muted-foreground leading-relaxed mb-10 font-light">{a.desc}</p>
                
                <button className="mt-auto text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                  View Docs <span className="text-lg opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">→</span>
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    );
}
