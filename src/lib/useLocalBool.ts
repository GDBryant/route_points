import { useState } from "react";

export function useLocalBool(key: string, def: boolean) {
  const [v, setV] = useState(() => {
    const s = localStorage.getItem(key);
    return s == null ? def : s === "on";
  });
  const set = (next: boolean) => {
    setV(next);
    localStorage.setItem(key, next ? "on" : "off");
  };
  return [v, set] as const;
}
