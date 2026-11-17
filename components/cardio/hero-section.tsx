"use client";

import { ClinicalQuestion } from "@/components/cardio/clinical-question";

export function HeroSection() {
  return (
    <section className="hero">
      <div className="container hero-grid">
        <ClinicalQuestion />
      </div>
    </section>
  );
}
