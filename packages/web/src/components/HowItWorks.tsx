"use client";

import { motion } from "framer-motion";

export function HowItWorks() {
  const steps = [
    {
      cmd: "memories add",
      arg: '"prefer functional components"',
      note: "Store rules and preferences locally",
    },
    {
      cmd: "memories recall",
      arg: '"auth flow"',
      note: "Query context by keyword or meaning",
    },
    {
      cmd: "memories generate",
      arg: "cursor",
      note: "Output native configs for any tool",
    },
  ];

  return (
    <section id="how-it-works" className="relative py-32 lg:py-44">
      <div className="w-full max-w-4xl mx-auto px-6">
        {/* Single terminal window showing the workflow */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          {/* Terminal frame */}
          <div className="rounded-xl border border-white/[0.08] bg-[#09090b] overflow-hidden shadow-2xl shadow-black/50">
            {/* Title bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                <div className="w-3 h-3 rounded-full bg-[#28c840]" />
              </div>
              <span className="ml-3 text-xs text-white/30 font-mono">~/project</span>
            </div>

            {/* Terminal content */}
            <div className="p-6 md:p-8 lg:p-10 space-y-8 font-mono">
              {steps.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ 
                    duration: 0.5, 
                    delay: 0.2 + i * 0.15,
                    ease: [0.16, 1, 0.3, 1]
                  }}
                  className="group"
                >
                  {/* Command line */}
                  <div className="flex items-baseline gap-3 text-base md:text-lg">
                    <span className="text-primary/60 select-none">$</span>
                    <span className="text-white font-medium">{step.cmd}</span>
                    <span className="text-primary">{step.arg}</span>
                  </div>
                  
                  {/* Output/description */}
                  <div className="mt-2 ml-6 text-sm text-white/40">
                    <span className="text-white/20">→</span> {step.note}
                  </div>
                </motion.div>
              ))}

              {/* Cursor line */}
              <div className="flex items-center gap-3 text-base md:text-lg">
                <span className="text-primary/60 select-none">$</span>
                <span className="w-2.5 h-5 bg-primary/70 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Ambient glow */}
          <div className="absolute -inset-px rounded-xl bg-gradient-to-b from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </motion.div>

        {/* Caption */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center text-white/40 text-sm mt-8"
        >
          Local SQLite database. Works offline. Syncs when you want it to.
        </motion.p>
      </div>
    </section>
  );
}
