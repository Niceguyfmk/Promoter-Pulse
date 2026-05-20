"use client";

import { useEffect } from "react";

export function DisableNumberScroll() {
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const activeElement = document.activeElement;
      if (
        activeElement?.tagName === "INPUT" &&
        (activeElement as HTMLInputElement).type === "number"
      ) {
        // Blur the input to prevent scroll from changing the number, while still allowing the page to scroll
        (activeElement as HTMLInputElement).blur();
      }
    };

    // { passive: false } is required so preventDefault() works on wheel events
    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      window.removeEventListener("wheel", handleWheel);
    };
  }, []);

  return null;
}
