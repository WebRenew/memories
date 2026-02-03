"use client";

import { motion } from "framer-motion";

export function WhyItMatters() {
  const cases = [
    {
      title: "Use Any Tool",
      desc: "Your rules follow you across Claude Code, Cursor, Copilot, Windsurf, and more. No copy-pasting between config files.",
      example: "memories generate all"
    },
    {
      title: "Stay Consistent",
      desc: "Define coding standards once and every AI agent follows them — whether it's a new session or a new teammate.",
      example: "memories add --rule 'Always use server components'"
    },
    {
      title: "Never Re-Explain",
      desc: "Come back to a project after months. Your agent already knows the architecture, the decisions, and the why.",
      example: "memories recall 'architecture decisions'"
    }
  ];

  return (
    <section className="py-32 px-6 ">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-24">
          {cases.map((c, idx) => (
            <motion.div 
              key={idx}
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.6 }}
              className="flex flex-col group"
            >
              <div className="h-px w-12 bg-primary/30 mb-10 group-hover:w-full transition-all duration-700" />
              <h4 className="text-xl font-bold mb-6 tracking-tight text-white uppercase tracking-wider">{c.title}</h4>
              <p className="text-[14px] text-muted-foreground leading-relaxed mb-10 font-light">
                {c.desc}
              </p>
              <div className="mt-auto font-mono text-[9px] text-primary/40 uppercase tracking-[0.2em] font-bold group-hover:text-primary transition-colors">
                $ {c.example}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
