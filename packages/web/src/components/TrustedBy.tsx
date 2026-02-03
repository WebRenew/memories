"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const tools = [
  { name: "Claude Code", logo: "/logos/claude-code.svg" },
  { name: "Cursor", logo: "/logos/cursor.svg" },
  { name: "GitHub Copilot", logo: "/logos/copilot.svg" },
  { name: "Windsurf", logo: "/logos/windsurf.svg" },
  { name: "Gemini", logo: "/logos/gemini.svg" },
  { name: "Codex", logo: "/logos/codex.svg" },
  { name: "Roo", logo: "/logos/roo.svg" },
  { name: "Cline", logo: "/logos/cline.svg" },
  { name: "OpenCode", logo: "/logos/opencode.svg" },
  { name: "Kilo", logo: "/logos/kilo.svg" },
  { name: "Amp", logo: "/logos/amp.svg" },
  { name: "Trae", logo: "/logos/trae.svg" },
  { name: "Goose", logo: "/logos/goose.svg" },
];

const marqueeItems = [...tools, ...tools, ...tools];

export function TrustedBy() {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1, delay: 0.8 }}
      className="relative w-full px-6 lg:px-9 -mt-8 mb-12 md:mb-20"
    >
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-10">
          {/* Label */}
          <p className="shrink-0 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground/60">
            Works with
          </p>

          {/* Marquee */}
          <div className="relative w-full overflow-hidden">
            <div className="relative flex overflow-hidden group">
              <div
                className="flex w-fit items-center whitespace-nowrap"
                style={{ animation: "marquee 60s linear infinite" }}
                data-marquee
              >
                {marqueeItems.map((tool, index) => (
                  <div
                    key={`${tool.name}-${index}`}
                    className="flex shrink-0 items-center gap-2 px-5 lg:px-7 opacity-60 hover:opacity-100 transition-opacity duration-300"
                  >
                    <Image
                      src={tool.logo}
                      alt={tool.name}
                      width={16}
                      height={16}
                      className="opacity-70"
                    />
                    <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-muted-foreground">
                      {tool.name}
                    </span>
                  </div>
                ))}
              </div>

              {/* Edge fades */}
              <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent z-10" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent z-10" />
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
