"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function FAQ() {
  const faqs = [
    {
      q: "What's the difference between global and project memory?",
      a: "Global memory stores your personal preferences, common patterns, and cross-project knowledge. Project memory is repository-specific — automatically scoped using your git remote URL — containing codebase rules, architectural decisions, and local context."
    },
    {
      q: "Does this lock me into one tool?",
      a: "No. memories.sh generates native rule files for 8+ tools including Cursor, Claude Code, GitHub Copilot, Windsurf, Cline, Roo, and Gemini. You can also export all data to JSON or YAML at any time."
    },
    {
      q: "How do you store and retrieve memory?",
      a: "Memories are stored in a local SQLite database on your machine using FTS5 full-text search with BM25 ranking. Queries use prefix matching and intelligent ranking for fast, relevant retrieval."
    },
    {
      q: "Can I export my data?",
      a: "Yes. You own your data — it lives on your machine. Run 'memories export' to export everything to JSON or YAML, or 'memories import' to bring data in from those formats."
    },
    {
      q: "Where is my data stored?",
      a: "All data is stored locally at ~/.config/memories/local.db on your machine. Optional cloud sync via Turso is available for accessing memories across devices, but is not required."
    }
  ];

    return (
      <section id="faq" className="py-32 px-6  border-t border-border">
        <div className="max-w-3xl mx-auto">
          <div className="mb-24 flex flex-col items-center text-center">
            <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-primary mb-4">Support</div>
            <h2 className="text-4xl md:text-6xl font-bold tracking-tighter text-foreground">Questions & Answers</h2>
          </div>
          <div className="space-y-1">
            {faqs.map((faq, idx) => (
              <FAQItem key={idx} question={faq.q} answer={faq.a} />
            ))}
          </div>
        </div>
      </section>
    );
  }
  
  function FAQItem({ question, answer }: { question: string, answer: string }) {
    const [isOpen, setIsOpen] = useState(false);
  
    return (
      <div className={`border border-border bg-card/10 transition-all duration-500 ${isOpen ? 'bg-card/20' : 'hover:bg-card/15'}`}>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-10 text-left transition-colors"
        >
          <span className="font-bold tracking-tight text-lg text-foreground">{question}</span>
        <div className={`transition-transform duration-500 ${isOpen ? 'rotate-45 text-primary' : 'text-muted-foreground/40'}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-10 pb-10 text-[14px] text-muted-foreground leading-relaxed font-light">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
