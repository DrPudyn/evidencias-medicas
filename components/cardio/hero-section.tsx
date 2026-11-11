"use client";

import type { FormEvent } from "react";
import { ClinicalQuestion } from "@/components/cardio/clinical-question";

export function HeroSection({
  q,
  onQueryChange,
  onSearch,
}: {
  q: string;
  onQueryChange: (value: string) => void;
  onSearch: (event?: FormEvent) => void;
}) {
  return (
    <section className="hero">
      <div className="container hero-grid">
        <ClinicalQuestion q={q} onQueryChange={onQueryChange} onSearch={onSearch} />
      </div>
    </section>
  );
}
