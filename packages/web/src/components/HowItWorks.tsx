"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function HowItWorks() {
  const [activeTab, setActiveTab] = useState<"cli" | "mcp">("cli");
  const [copied, setCopied] = useState(false);

  const installCommands = {
    cli: "pnpm add -g @memories.sh/cli",
    mcp: "memories serve",
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(installCommands[activeTab]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const cliSteps = [
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

  const mcpSteps = [
    {
      tool: "add_memory",
      params: '{ content: "prefer functional components", type: "rule" }',
      note: "Agents store context directly",
    },
    {
      tool: "get_context",
      params: '{ query: "auth flow" }',
      note: "Returns rules + relevant memories",
    },
    {
      tool: "get_rules",
      params: "{ }",
      note: "All active rules for current project",
    },
  ];

  return (
    <section id="how-it-works" className="relative py-32 lg:py-44">
      <div className="w-full px-6 lg:px-16 xl:px-24">
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-12 lg:gap-16 items-start">
          {/* Left column - Text content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-start text-left"
          >
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground mb-4">
              {activeTab === "cli" ? "Three commands. That's it." : "Seven tools. Direct access."}
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              {activeTab === "cli" 
                ? "Store context, recall it anywhere, and generate configs for any tool—all from your terminal."
                : "Agents interact with your memory store directly via the built-in MCP server."
              }
            </p>

            {/* Tab switcher */}
            <div className="mb-6">
              <div className="inline-flex items-center p-1 bg-muted border border-border rounded-lg">
                <button
                  onClick={() => setActiveTab("cli")}
                  className={`px-4 py-2 text-sm font-mono uppercase tracking-wider rounded-md transition-all duration-200 ${
                    activeTab === "cli"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  CLI
                </button>
                <button
                  onClick={() => setActiveTab("mcp")}
                  className={`px-4 py-2 text-sm font-mono uppercase tracking-wider rounded-md transition-all duration-200 ${
                    activeTab === "mcp"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  MCP
                </button>
              </div>
            </div>

            {/* Install command */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-3 px-4 py-3 bg-muted/50 border border-border rounded-lg font-mono text-sm">
                <span className="text-muted-foreground select-none">$</span>
                <code className="text-foreground">{installCommands[activeTab]}</code>
                <button
                  onClick={handleCopy}
                  className="p-1.5 hover:bg-foreground/10 rounded-md transition-colors text-muted-foreground hover:text-foreground"
                  aria-label="Copy command"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Caption */}
            <p className="text-muted-foreground text-sm">
              {activeTab === "cli" 
                ? "Local SQLite database. Works offline. Syncs when you want it to."
                : "Works with any MCP-compatible client."
              }
            </p>
          </motion.div>

          {/* Right column - Terminal */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            {/* Terminal frame */}
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-lg dark:shadow-2xl dark:shadow-black/50">
              {/* Title bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                  <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                  <div className="w-3 h-3 rounded-full bg-[#28c840]" />
                </div>
                <span className="ml-3 text-xs text-muted-foreground font-mono">
                  {activeTab === "cli" ? "~/project" : "mcp-server"}
                </span>
              </div>

              {/* Content */}
              <div className="p-6 md:p-8 space-y-6 font-mono">
                {activeTab === "cli" ? (
                  <>
                    {cliSteps.map((step, i) => (
                      <motion.div
                        key={`cli-${i}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ 
                          duration: 0.5, 
                          delay: 0.1 + i * 0.1,
                          ease: [0.16, 1, 0.3, 1]
                        }}
                        className="group"
                      >
                        <div className="flex items-baseline gap-3 text-sm md:text-base">
                          <span className="text-primary/60 select-none">$</span>
                          <span className="text-foreground font-medium">{step.cmd}</span>
                          <span className="text-primary">{step.arg}</span>
                        </div>
                        <div className="mt-1.5 ml-5 text-xs text-muted-foreground">
                          <span className="text-muted-foreground/50">→</span> {step.note}
                        </div>
                      </motion.div>
                    ))}
                    <div className="flex items-center gap-3 text-sm md:text-base">
                      <span className="text-primary/60 select-none">$</span>
                      <span className="w-2 h-4 bg-primary/70 animate-pulse" />
                    </div>
                  </>
                ) : (
                  <>
                    {mcpSteps.map((step, i) => (
                      <motion.div
                        key={`mcp-${i}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ 
                          duration: 0.5, 
                          delay: 0.1 + i * 0.1,
                          ease: [0.16, 1, 0.3, 1]
                        }}
                        className="group"
                      >
                        <div className="flex items-baseline gap-2 text-sm md:text-base flex-wrap">
                          <span className="text-primary font-medium">{step.tool}</span>
                          <span className="text-muted-foreground text-xs">{step.params}</span>
                        </div>
                        <div className="mt-1.5 text-xs text-muted-foreground">
                          <span className="text-muted-foreground/50">→</span> {step.note}
                        </div>
                      </motion.div>
                    ))}
                    <div className="text-xs text-muted-foreground/60 pt-4 border-t border-border">
                      + 4 more tools: search_memories, list_memories, edit_memory, forget_memory
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Ambient glow */}
            <div className="absolute -inset-px rounded-xl bg-gradient-to-b from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
