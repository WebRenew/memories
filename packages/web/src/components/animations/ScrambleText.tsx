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
  /** Enable per-word hover effect (more subtle) */
  wordHover?: boolean;
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
 * Individual word with hover scramble effect
 */
function ScrambleWord({ word, isFirst }: { word: string; isFirst: boolean }) {
  const [displayText, setDisplayText] = useState(word);
  const animationRef = useRef<gsap.core.Tween | null>(null);
  const isAnimating = useRef(false);

  const handleMouseEnter = useCallback(() => {
    if (isAnimating.current) return;
    isAnimating.current = true;

    if (animationRef.current) {
      animationRef.current.kill();
    }

    // Very quick and subtle for word hover
    animationRef.current = runScrambleAnimation(word, 0.2, setDisplayText, () => {
      isAnimating.current = false;
    });
  }, [word]);

  // Update display if word prop changes
  useEffect(() => {
    if (!isAnimating.current) {
      setDisplayText(word);
    }
  }, [word]);

  return (
    <span
      onMouseEnter={handleMouseEnter}
      className="cursor-default"
    >
      {isFirst ? "" : " "}{displayText}
    </span>
  );
}

/**
 * Scramble text animation component - subtle wave reveal on mount, optional hover.
 * With wordHover=true, individual words scramble on hover instead of the whole text.
 */
export function ScrambleText({
  text,
  className,
  delayMs = 0,
  duration = 0.5,
  hoverEffect = true,
  wordHover = true,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally run once on mount only
  }, []);

  // Handle text prop changes after initial animation
  useEffect(() => {
    if (hasAnimated && displayText !== text) {
      setDisplayText(text);
    }
  }, [text, hasAnimated, displayText]);

  // Full text hover effect handler
  const handleMouseEnter = useCallback(() => {
    if (!hoverEffect || wordHover || isAnimating.current) return;
    isAnimating.current = true;

    if (animationRef.current) {
      animationRef.current.kill();
    }

    animationRef.current = runScrambleAnimation(text, 0.3, setDisplayText, () => {
      isAnimating.current = false;
    });
  }, [text, hoverEffect, wordHover]);

  // If wordHover is enabled and initial animation is done, render words separately
  if (wordHover && hasAnimated) {
    const words = text.split(" ");
    return (
      <span ref={containerRef} className={className}>
        {words.map((word, i) => (
          <ScrambleWord key={`${word}-${i}`} word={word} isFirst={i === 0} />
        ))}
      </span>
    );
  }

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
