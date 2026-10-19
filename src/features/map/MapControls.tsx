import type { GeoPosition } from "@/features/tracking/useGeolocation";

export default function MapControls({
  showEditorFabs,
  position,
  onAddHere,
  onRecord,
  onSettings,
  headingUp,
  onToggleHeading,
  onZoomToAdventure,
}: {
  showEditorFabs: boolean;
  position: GeoPosition | null;
  onAddHere: () => void;
  onRecord: () => void;
  onSettings: () => void;
  headingUp: boolean;
  onToggleHeading: () => void;
  onZoomToAdventure: () => void;
}) {
  return (
    <>
      {showEditorFabs && (
        <>
          <button
            className="fab"
            disabled={!position}
            title={position ? undefined : "Waiting for GPS"}
            onClick={onAddHere}
          >
            + Point
          </button>
          <button className="fab fab2" onClick={onRecord}>
            Record
          </button>
          <button className="gear" onClick={onSettings}>
            ⚙
          </button>
        </>
      )}
      <button
        className={`compass-btn${headingUp ? " active" : ""}`}
        title="Heading up"
        onClick={onToggleHeading}
      >
        🧭
      </button>
      <button
        className="zoomadv-btn"
        title="Zoom to adventure"
        onClick={onZoomToAdventure}
      >
        ⛶
      </button>
    </>
  );
}
