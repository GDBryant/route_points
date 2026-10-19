import { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import MapView, { type FlyTarget } from "./MapView";
import MapBanners from "./MapBanners";
import MapControls from "./MapControls";
import MembersTab from "./MembersTab";
import TabBar, { type Tab } from "./TabBar";
import AdventureSheets, { type Sheet } from "./AdventureSheets";
import { AdventureContext, type AdventureCtx } from "./AdventureContext";
import { useAdventure } from "./useAdventure";
import { useMovePoint } from "./useMovePoint";
import { useRecordingFlow } from "./useRecordingFlow";
import { PositionProvider } from "@/features/tracking/PositionContext";
import { useGeoStatus } from "@/features/tracking/position";
import { useAuth } from "@/features/auth/useAuth";
import { usePoints } from "@/features/points/usePoints";
import { removePoint, swapSeq } from "@/features/points/repo";
import type { Point } from "@/features/points/api";
import AddPointSheet from "@/features/points/AddPointSheet";
import PointDetailSheet from "@/features/points/PointDetailSheet";
import PointsList from "@/features/points/PointsList";
import { useRoutes } from "@/features/routes/useRoutes";
import { saveRouteLocal, removeRoute } from "@/features/routes/repo";
import type { RouteRow } from "@/features/routes/api";
import { useSync } from "@/features/sync/useSync";
import SyncBadge from "@/features/sync/SyncBadge";
import { usePositions } from "@/features/live/usePositions";
import NavigateHud from "@/features/live/NavigateHud";
import RecordSheet from "@/features/routes/RecordSheet";
import FinishRouteSheet from "@/features/routes/FinishRouteSheet";
import RouteDetailSheet, {
  type RoutePatch,
} from "@/features/routes/RouteDetailSheet";
import RoutesList from "@/features/routes/RoutesList";
import { boundsOf } from "@/features/tiles/tileMath";

export default function MapPage() {
  return (
    <PositionProvider>
      <MapPageBody />
    </PositionProvider>
  );
}

function MapPageBody() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, profile } = useAuth();
  const token = params.get("token");
  const { guest, adv, setAdv, isEditor, isOwner, snapRadius, setSnapRadius } =
    useAdventure({ id, token, user });
  const exit = () => navigate(guest ? "/" : "/adventures");
  const { state, request, posRef } = useGeoStatus();
  const { points, refresh } = usePoints(
    guest ? { token: token! } : { adventureId: id },
  );
  const { routes, refresh: refreshRoutes } = useRoutes(
    guest ? { token: token! } : { adventureId: id },
  );
  const [tab, setTab] = useState<Tab>("map");
  const [selected, setSelected] = useState<Point | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<RouteRow | null>(null);
  const [flyTo, setFlyTo] = useState<FlyTarget | null>(null);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [headingUp, setHeadingUp] = useState(false);
  const [navTarget, setNavTarget] = useState<Point | null>(null);
  const [sharePos, setSharePos] = useState(
    () => localStorage.getItem("sharePos") !== "off",
  );

  const move = useMovePoint({ adventureId: id, setFlyTo, refresh });
  const flow = useRecordingFlow({
    adventureId: id,
    points,
    snapRadius,
    refreshPoints: refresh,
    refreshRoutes,
  });
  const sync = useSync();
  const self =
    user && profile
      ? {
          user_id: user.id,
          name: profile.display_name || user.email?.split("@")[0] || "me",
          colour: profile.colour || "#1e88e5",
        }
      : null;
  const { others, online } = usePositions({
    adventureId: id,
    token: guest ? token : null,
    publish: isEditor && sharePos,
    self,
    posRef,
  });
  const othersArr = useMemo(() => [...others.values()], [others]);

  const onDelete = async (p: Point) => {
    await removePoint(p);
    setSelected(null);
  };

  const onRouteUpdate = async (r: RouteRow, patch: RoutePatch) => {
    await saveRouteLocal({
      adventure_id: id,
      client_id: r.client_id,
      name: patch.name,
      from_point_id: patch.from_point_id,
      to_point_id: patch.to_point_id,
      direction: patch.direction,
      mode: r.mode,
      interval_s: r.interval_s,
      started_at: r.started_at ?? undefined,
      ended_at: r.ended_at,
    });
    refreshRoutes();
    setSelectedRoute({ ...r, ...patch });
  };

  const onRouteDelete = async (r: RouteRow) => {
    await removeRoute(r);
    setSelectedRoute(null);
  };

  const zoomToAdventure = () => {
    const b = boundsOf(points, routes, posRef.current);
    if (b) setFlyTo({ ...b, t: Date.now() });
  };

  const openAdd = flow.openAdd;
  const onLongPress = useCallback(
    (lat: number, lng: number) => openAdd(lat, lng, null),
    [openAdd],
  );

  const toggleSharePos = () => {
    const next = !sharePos;
    setSharePos(next);
    localStorage.setItem("sharePos", next ? "on" : "off");
  };

  const { adding, finishing, recorder, recording } = flow;
  const ctx = useMemo<AdventureCtx>(
    () => ({
      id,
      adv,
      guest,
      isEditor,
      isOwner,
      snapRadius,
      points,
      routes,
      refresh: () => {
        refresh();
        refreshRoutes();
      },
    }),
    [
      id,
      adv,
      guest,
      isEditor,
      isOwner,
      snapRadius,
      points,
      routes,
      refresh,
      refreshRoutes,
    ],
  );
  const banner =
    guest ||
    !sync.online ||
    !!move.moving ||
    state === "prompt" ||
    state === "denied";

  return (
    <AdventureContext.Provider value={ctx}>
      <div className={`mappage${banner ? " has-banner" : ""}`}>
        <MapBanners
          guest={guest}
          geoState={state}
          onEnableLocation={request}
          online={sync.online}
          moving={move.moving}
          onSaveMove={move.save}
          onCancelMove={move.cancel}
        />
        {!guest && (
          <SyncBadge
            online={sync.online}
            pending={sync.pending}
            dead={sync.dead}
            syncing={sync.syncing}
            onSync={sync.syncNow}
          />
        )}
        <MapView
          points={points}
          routes={routes}
          recordingCoords={flow.recordingCoords}
          others={othersArr}
          headingUp={headingUp}
          onMarkerTap={setSelected}
          onRouteTap={setSelectedRoute}
          onLongPress={isEditor ? onLongPress : undefined}
          movingId={move.moving?.id ?? null}
          onCenterChange={move.onCenterChange}
          flyTo={flyTo}
        />

        {tab === "points" && (
          <div className="panel overlay">
            <PointsList
              points={points}
              isEditor={isEditor}
              onTap={(p) => {
                setFlyTo({ lat: p.lat, lng: p.lng, t: Date.now() });
                setTab("map");
              }}
              onMove={(p, dir) => swapSeq(id, points, p, dir)}
              onDelete={isEditor ? onDelete : undefined}
            />
          </div>
        )}
        {tab === "routes" && (
          <div className="panel overlay">
            <RoutesList
              routes={routes}
              points={points}
              onTap={(r) => {
                if (r.coords.length)
                  setFlyTo({
                    lat: r.coords[0][1],
                    lng: r.coords[0][0],
                    t: Date.now(),
                  });
                setTab("map");
              }}
              onDelete={isEditor ? onRouteDelete : undefined}
            />
          </div>
        )}
        {tab === "members" && (
          <MembersTab
            adventureId={id}
            others={others}
            online={online}
            onFly={(lat, lng) => {
              setFlyTo({ lat, lng, t: Date.now() });
              setTab("map");
            }}
          />
        )}

        {tab === "map" && (
          <MapControls
            showEditorFabs={isEditor && !adding && !recording && !finishing}
            onAddHere={flow.addHere}
            onRecord={flow.openRecord}
            onSettings={() => setSheet("settings")}
            headingUp={headingUp}
            onToggleHeading={() => setHeadingUp((h) => !h)}
            onZoomToAdventure={zoomToAdventure}
          />
        )}

        {navTarget && (
          <NavigateHud point={navTarget} onClose={() => setNavTarget(null)} />
        )}

        {selected && !adding && (
          <PointDetailSheet
            point={selected}
            isEditor={isEditor}
            onEdit={(p) => {
              setSelected(null);
              flow.openAdd(p.lat, p.lng, null, { initial: p });
            }}
            onMove={
              isEditor
                ? (p) => {
                    setSelected(null);
                    move.startMove(p);
                  }
                : undefined
            }
            onDelete={onDelete}
            onNavigate={(p) => {
              setNavTarget(p);
              setSelected(null);
            }}
            onClose={() => setSelected(null)}
          />
        )}

        {selectedRoute && (
          <RouteDetailSheet
            route={selectedRoute}
            points={points}
            isEditor={isEditor}
            onUpdate={onRouteUpdate}
            onDelete={onRouteDelete}
            onClose={() => setSelectedRoute(null)}
          />
        )}

        {recording && recorder.state === "recording" && (
          <RecordSheet
            state="recording"
            mode={recorder.route?.mode}
            waypointCount={recorder.waypointCount}
            elapsedS={recorder.elapsedS}
            onStart={() => {}}
            onDrop={flow.onDrop}
            onStop={flow.onStop}
          />
        )}
        {recording && recorder.state === "idle" && (
          <RecordSheet
            state="idle"
            waypointCount={0}
            elapsedS={0}
            onStart={flow.onStart}
            onDrop={() => {}}
            onStop={flow.cancelRecord}
          />
        )}

        {finishing && !adding && (
          <FinishRouteSheet
            key={finishing.forceToId ?? ""}
            route={finishing.route}
            lastPos={finishing.lastPos}
            points={points}
            snapRadiusM={snapRadius}
            routeCount={routes.length}
            forceToId={finishing.forceToId}
            onSave={flow.saveRoute}
            onNewPoint={finishing.lastPos ? flow.newEndFromFinish : undefined}
          />
        )}

        {adding && (
          <AddPointSheet
            lat={adding.lat}
            lng={adding.lng}
            accuracy={adding.accuracy}
            points={points}
            initial={adding.initial}
            initialKind={adding.kind}
            initialName={adding.name}
            recording={recorder.state === "recording" && !adding.role}
            endRouteAt={flow.endRouteAt}
            onEndRouteAt={flow.setEndRouteAt}
            onSave={flow.savePoint}
            onClose={flow.closeAdd}
          />
        )}

        <AdventureSheets
          sheet={sheet}
          setSheet={setSheet}
          sharePos={sharePos}
          onToggleShare={toggleSharePos}
          onSaved={(snap, name) => {
            setSnapRadius(snap);
            if (adv) setAdv({ ...adv, name, snap_radius_m: snap });
          }}
          onExit={exit}
        />

        <TabBar tab={tab} onChange={setTab} onExit={exit} />
      </div>
    </AdventureContext.Provider>
  );
}
