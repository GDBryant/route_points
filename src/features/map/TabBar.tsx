export type Tab = "map" | "points" | "routes" | "members";

export default function TabBar({
  tab,
  onChange,
  onExit,
}: {
  tab: Tab;
  onChange: (t: Tab) => void;
  onExit: () => void;
}) {
  return (
    <nav className="tabbar">
      {(["map", "points", "routes", "members"] as Tab[]).map((t) => (
        <button
          key={t}
          className={tab === t ? "tab active" : "tab"}
          onClick={() => onChange(t)}
        >
          {t[0].toUpperCase() + t.slice(1)}
        </button>
      ))}
      <button
        className="tab exit"
        title="Exit adventure"
        aria-label="Exit adventure"
        onClick={onExit}
      >
        ⎋
      </button>
    </nav>
  );
}
