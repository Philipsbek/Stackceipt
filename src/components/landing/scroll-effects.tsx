"use client";

import { useEffect, useRef } from "react";

export function LandingScrollEffects() {
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const header = document.querySelector<HTMLElement>("[data-landing-header]");
    const parallaxElements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-scroll-parallax]"),
    );
    let frame = 0;

    const update = () => {
      frame = 0;
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollableHeight > 0 ? Math.min(window.scrollY / scrollableHeight, 1) : 0;

      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${progress})`;
      }

      if (header) header.dataset.scrolled = window.scrollY > 16 ? "true" : "false";

      if (!reducedMotion.matches) {
        const viewportCenter = window.innerHeight / 2;
        parallaxElements.forEach((element) => {
          const rect = element.getBoundingClientRect();
          const elementCenter = rect.top + rect.height / 2;
          const distance = elementCenter - viewportCenter;
          const rate = Number(element.dataset.scrollParallax ?? 0.025);
          const shift = Math.max(-14, Math.min(14, distance * rate));
          element.style.setProperty("--scroll-shift", `${shift.toFixed(2)}px`);
        });
      }
    };

    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5" aria-hidden="true">
      <div ref={progressRef} className="landing-scroll-progress h-full w-full origin-left bg-foreground" />
    </div>
  );
}
