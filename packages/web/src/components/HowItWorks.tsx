"use client";

import { motion } from "framer-motion";
import { useRef } from "react";
import { NoiseTexture } from "./NoiseTexture";

interface StepItem {
  number: string;
  title: string;
  command: string;
  args: string;
  description: string;
}

function FlowArrow() {
  return (
    <div className="hidden lg:flex items-center justify-center">
      <svg width="60" height="24" viewBox="0 0 60 24" fill="none" className="text-primary/30">
        <path 
          d="M0 12H52M52 12L44 4M52 12L44 20" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function TerminalBlock({ command, args, isActive }: { command: string; args: string; isActive?: boolean }) {
  return (
    <div className="relative group">
      {/* Glow effect */}
      <div className={`absolute -inset-1 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent rounded-lg blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${isActive ? 'opacity-60' : ''}`} />
      
      <div className="relative bg-[#0d0d12] border border-white/10 rounded-lg overflow-hidden">
        {/* Terminal header */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-white/[0.02]">
          <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
          <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
          <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
          <span className="ml-2 text-[10px] text-white/30 font-mono">terminal</span>
        </div>
        
        {/* Command line */}
        <div className="px-5 py-4 font-mono">
          <div className="flex items-start gap-2">
            <span className="text-primary/70 select-none text-sm">$</span>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-white font-medium text-sm">{command}</span>
              <span className="text-primary text-sm">{args}</span>
              <span className="inline-block w-2 h-4 bg-primary/80 animate-pulse ml-1" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepCard({ item, idx }: { item: StepItem; idx: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ 
        duration: 0.8, 
        delay: idx * 0.15,
        ease: [0.16, 1, 0.3, 1]
      }}
      className="relative flex flex-col"
    >
      {/* Large backdrop number */}
      <div className="absolute -top-8 -left-2 text-[140px] font-bold leading-none text-white/[0.03] select-none pointer-events-none tracking-tighter">
        {item.number}
      </div>
      
      <div className="relative z-10">
        {/* Step indicator */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center justify-center w-10 h-10 rounded-full border border-primary/30 bg-primary/5">
            <span className="text-sm font-bold text-primary">{item.number}</span>
          </div>
          <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" />
        </div>
        
        {/* Title */}
        <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 tracking-tight">
          {item.title}
        </h3>
        
        {/* Terminal */}
        <div className="mb-5">
          <TerminalBlock command={item.command} args={item.args} isActive={idx === 0} />
        </div>
        
        {/* Description */}
        <p className="text-[15px] text-white/50 leading-relaxed max-w-sm">
          {item.description}
        </p>
      </div>
    </motion.div>
  );
}

export function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  
  const steps: StepItem[] = [
    {
      number: "1",
      title: "Store",
      command: "memories add",
      args: "\"Use Tailwind for styling\"",
      description: "Save rules, preferences, and context to a local SQLite database. Works offline, always.",
    },
    {
      number: "2",
      title: "Recall",
      command: "memories recall",
      args: "\"auth\"",
      description: "Query by keyword or semantic search. Get relevant context for your current task.",
    },
    {
      number: "3",
      title: "Generate",
      command: "memories generate",
      args: "cursor",
      description: "Output native config files for any supported tool. One memory store, any agent.",
    },
  ];

  return (
    <section 
      ref={sectionRef}
      id="how-it-works" 
      className="relative py-32 lg:py-40 border-y border-white/10 overflow-hidden"
    >
      {/* Ambient background */}
      <div className="absolute inset-0 opacity-20">
        <NoiseTexture parentRef={sectionRef} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent" />
      
      <div className="relative z-10 w-full px-6 lg:px-16 xl:px-24">
        {/* Section header - centered */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20 lg:mb-28"
        >
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[11px] uppercase tracking-[0.3em] font-bold text-primary">
              How It Works
            </span>
          </div>
          
          <h2 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-white leading-[1.05]">
            Three commands.<br />
            <span className="text-white/40">That&apos;s it.</span>
          </h2>
        </motion.div>

        {/* Steps with flow arrows */}
        <div className="grid lg:grid-cols-[1fr_auto_1fr_auto_1fr] gap-8 lg:gap-6 items-start max-w-6xl mx-auto">
          <StepCard item={steps[0]} idx={0} />
          <FlowArrow />
          <StepCard item={steps[1]} idx={1} />
          <FlowArrow />
          <StepCard item={steps[2]} idx={2} />
        </div>
      </div>
    </section>
  );
}
