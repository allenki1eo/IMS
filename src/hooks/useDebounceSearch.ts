"use client";
import { useState, useEffect } from "react";

export function useDebounceSearch(delay = 300) {
  const [value, setValue] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return { value, setValue, debounced };
}
