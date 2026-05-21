import { useCallback, useEffect, useRef, useState } from "react";

export function useTableScroll(scrollAmount = 200) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollability = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    checkScrollability();

    let timeoutId: number | undefined;
    const handleScroll = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(checkScrollability, 50);
    };

    container.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", checkScrollability);

    let resizeObserver: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(checkScrollability);
      resizeObserver.observe(container);
    }

    return () => {
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", checkScrollability);
      resizeObserver?.disconnect();
      window.clearTimeout(timeoutId);
    };
  }, [checkScrollability]);

  const scrollLeft = useCallback(() => {
    containerRef.current?.scrollBy({ left: -scrollAmount, behavior: "smooth" });
  }, [scrollAmount]);

  const scrollRight = useCallback(() => {
    containerRef.current?.scrollBy({ left: scrollAmount, behavior: "smooth" });
  }, [scrollAmount]);

  return { containerRef, canScrollLeft, canScrollRight, scrollLeft, scrollRight };
}
