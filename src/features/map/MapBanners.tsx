import type { Point } from "@/features/points/api";
import type { GeoState } from "@/features/tracking/useGeolocation";

export default function MapBanners({
  guest,
  geoState,
  onEnableLocation,
  online,
  moving,
  onSaveMove,
  onCancelMove,
}: {
  guest: boolean;
  geoState: GeoState;
  onEnableLocation: () => void;
  online: boolean;
  moving: Point | null;
  onSaveMove: () => void;
  onCancelMove: () => void;
}) {
  return (
    <>
      {guest && <div className="banner">Viewing as guest</div>}
      {geoState === "prompt" && (
        <div className="banner">
          Location is off
          <button className="linklike" onClick={onEnableLocation}>
            Enable location
          </button>
        </div>
      )}
      {geoState === "denied" && (
        <div className="banner">
          Location unavailable — turn on device location or allow it in site
          settings
        </div>
      )}
      {!online && (
        <div className="banner offline">Offline — changes will sync</div>
      )}
      {moving && (
        <div className="banner">
          Pan map to position “{moving.name}”
          <button className="linklike" onClick={onSaveMove}>
            Save
          </button>
          <button className="linklike" onClick={onCancelMove}>
            Cancel
          </button>
        </div>
      )}
    </>
  );
}
