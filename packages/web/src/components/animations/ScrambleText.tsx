"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import gsap from "gsap";

interface ScrambleTextProps {
  text: string;
  className?: string;
  /** Delay in milliseconds before animation starts */
  delayMs?: number;
  /** Duration of the scramble animation in seconds */
  duration?: number;
  /** Enable hover re-scramble effect */
  hoverEffect?: boolean;
}

// Subtle glyphs - lowercase letters and simple characters
const GLYPHS = "abcdefghijklmnopqrstuvwxyz-_.";

/**
 * Run a subtle scramble animation - reveals from left to right
 * with only a few characters scrambling at the "wave front"
 */
function runScrambleAnimation(
  text: string,
  duration: number,
  setDisplayText: (text: string) => void,
  onComplete?: () => void,
): gsap.core.Tween {
  const finalChars = text.split("");
  const totalChars = finalChars.length;
  const scrambleObj = { progress: 0 };

  return gsap.to(scrambleObj, {
    progress: 1,
    duration,
    ease: "power1.out",
    onUpdate: () => {
      const revealedCount = Math.floor(scrambleObj.progress * totalChars);
      // Only scramble 2-3 characters at the wave front
      const waveFrontStart = Math.max(0, revealedCount - 3);

      const newDisplay = finalChars
        .map((char, i) => {
          // Preserve spaces and punctuation
          if (char === " " || char === "." || char === "," || char === "'" || char === "-") {
            return char;
          }
          // Already revealed
          if (i < waveFrontStart) return char;
          // At the wave front - scramble
          if (i < revealedCount) {
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          }
          // Not yet reached - show original (subtle approach)
          return char;
        })
        .join("");

      setDisplayText(newDisplay);
    },
    onComplete: () => {
      setDisplayText(text);
      onComplete?.();
    },
  });
}

/**
 * Scramble text animation component - subtle wave reveal on mount, optional hover.
 */
export function ScrambleText({
  text,
  className,
  delayMs = 0,
  duration = 0.5,
  hoverEffect = true,
}: ScrambleTextProps) {
  // Start with actual text visible (no jarring flash)
  const [displayText, setDisplayText] = useState(text);
  const [hasAnimated, setHasAnimated] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const animationRef = useRef<gsap.core.Tween | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isAnimating = useRef(false);

  // Run animation only once on initial mount
  useEffect(() => {
    if (hasAnimated || !text) return;

    timeoutRef.current = setTimeout(() => {
      isAnimating.current = true;
      animationRef.current = runScrambleAnimation(
        text,
        duration,
        setDisplayText,
        () => {
          setHasAnimated(true);
          isAnimating.current = false;
        },
      );
    }, delayMs);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (animationRef.current) animationRef.current.kill();
    };
  }, []); // Empty deps - only run on mount

  // Handle text prop changes after initial animation
  useEffect(() => {
    if (hasAnimated && displayText !== text) {
      setDisplayText(text);
    }
  }, [text, hasAnimated, displayText]);

  // Hover effect handler - subtle and quick
  const handleMouseEnter = useCallback(() => {
    if (!hoverEffect || isAnimating.current) return;
    isAnimating.current = true;

    if (animationRef.current) {
      animationRef.current.kill();
    }

    animationRef.current = runScrambleAnimation(text, 0.3, setDisplayText, () => {
      isAnimating.current = false;
    });
  }, [text, hoverEffect]);

  return (
    <span
      ref={containerRef}
      className={className}
      onMouseEnter={handleMouseEnter}
    >
      {displayText || text}
    </span>
  );
}
