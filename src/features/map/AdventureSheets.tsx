import AdventureSettingsSheet from "@/features/adventures/AdventureSettingsSheet";
import ShareSheet from "@/features/adventures/ShareSheet";
import GpxSheet from "@/features/gpx/GpxSheet";
import { shareGpx } from "@/features/gpx/gpx";
import DownloadTilesSheet from "@/features/tiles/DownloadTilesSheet";
import { adventureBbox } from "@/features/tiles/tileMath";
import { useAdventureCtx } from "./AdventureContext";

export type Sheet = "settings" | "share" | "gpx" | "tiles";

export default function AdventureSheets({
  sheet,
  setSheet,
  sharePos,
  onToggleShare,
  onSaved,
  onExit,
}: {
  sheet: Sheet | null;
  setSheet: (s: Sheet | null) => void;
  sharePos: boolean;
  onToggleShare?: () => void;
  onSaved: (snap: number, name: string) => void;
  onExit: () => void;
}) {
  const {
    id: adventureId,
    adv,
    isOwner,
    isEditor,
    points,
    routes,
    refresh: onRefresh,
  } = useAdventureCtx();
  return (
    <>
      {sheet === "settings" && adv && (
        <AdventureSettingsSheet
          adventure={adv}
          isOwner={isOwner}
          onSaved={onSaved}
          sharePos={sharePos}
          onToggleShare={isEditor ? onToggleShare : undefined}
          onExportGpx={async () => {
            await shareGpx(adv?.name ?? "adventure", points, routes);
            setSheet(null);
          }}
          onImportGpx={isEditor ? () => setSheet("gpx") : undefined}
          onShare={() => setSheet("share")}
          onOfflineMaps={() => setSheet("tiles")}
          onExit={onExit}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === "share" && adv && (
        <ShareSheet
          token={adv.share_token}
          name={adv.name}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === "gpx" && (
        <GpxSheet
          adventureId={adventureId}
          isEditor={isEditor}
          onClose={() => setSheet(null)}
          onDone={onRefresh}
        />
      )}
      {sheet === "tiles" && (
        <DownloadTilesSheet
          adventureId={adventureId}
          bbox={adventureBbox([
            ...points,
            ...routes.flatMap((r) =>
              r.coords.map(([lng, lat]) => ({ lat, lng })),
            ),
          ])}
          onClose={() => setSheet(null)}
        />
      )}
    </>
  );
}
