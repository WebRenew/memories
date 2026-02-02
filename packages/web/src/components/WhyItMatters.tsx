"use client";

import { motion } from "framer-motion";

export function WhyItMatters() {
  const cases = [
    {
      title: "Contextual Continuity",
      desc: "Switch between Claude Code, OpenCode, and local scripts without re-explaining project state.",
      example: "memories sync"
    },
    {
      title: "Architectural Integrity",
      desc: "Ensure agents respect repository-specific rules, patterns, and design systems automatically.",
      example: "memories enforce"
    },
    {
      title: "Instant Resumption",
      desc: "Return to a codebase after months and have your agent immediately recall previous decisions.",
      example: "memories resume"
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
