"use client";

import { useEffect, useState } from "react";

interface FooterYearProps {
  initialYear: number;
}

export function FooterYear({ initialYear }: FooterYearProps) {
  const [year, setYear] = useState(initialYear);

  useEffect(() => {
    const liveYear = new Date().getFullYear();
    if (liveYear !== initialYear) {
      setYear(liveYear);
    }
  }, [initialYear]);

  return <>{year}</>;
}
