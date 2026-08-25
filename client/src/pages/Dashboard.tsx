import { useAuth } from "@/_core/hooks/useAuth";
import { MapView } from "@/components/Map";
import DashboardLayout from "@/components/DashboardLayout";
import EyeCore from "@/components/EyeCore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Activity, Check, Copy, Crosshair, Eye, Fingerprint, Link2, LockKeyhole, MapPin, Pause, Play, Radio, RefreshCw, ShieldCheck, UserRound, Users, Wifi, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";

type Point = { latitude: number; longitude: number; accuracy?: number | null };

type ViewName = "overview" | "connection" | "activity" | "privacy";

export default function Dashboard() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const view: ViewName = location === "/app/connection" ? "connection" : location === "/app/privacy" ? "privacy" : location === "/app/activity" ? "activity" : "overview";
  const utils = trpc.useUtils();
  const { data: status, isLoading, error } = trpc.connection.status.useQuery(undefined, { retry: false, refetchInterval: 15_000 });
  const [partnerCode, setPartnerCode] = useState("");
  const [geoState, setGeoState] = useState<"idle" | "requesting" | "active" | "denied" | "unsupported">("idle");
  const [geoError, setGeoError] = useState("");
  const [userLocation, setUserLocation] = useState<Point | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const mapMarkers = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const lastPushAt = useRef(0);

  const requestConnection = trpc.connection.request.useMutation({
    onSuccess: async () => { toast.success("Connection request sent."); setPartnerCode(""); await utils.connection.status.invalidate(); },
    onError: (mutationError) => toast.error(mutationError.message),
  });
  const respondConnection = trpc.connection.respond.useMutation({ onSuccess: async () => { toast.success("Connection updated."); await utils.connection.status.invalidate(); }, onError: errorValue => toast.error(errorValue.message) });
  const updatePrivacy = trpc.privacy.update.useMutation({ onSuccess: async () => { await utils.connection.status.invalidate(); }, onError: errorValue => { setGeoState("idle"); toast.error(errorValue.message); } });
  const disconnectConnection = trpc.connection.disconnect.useMutation({ onSuccess: async () => { toast.success("Connection disconnected."); await utils.connection.status.invalidate(); }, onError: errorValue => toast.error(errorValue.message) });
  const pushLocation = trpc.location.push.useMutation({ onError: errorValue => setGeoError(errorValue.message) });

  const activeConnection = status?.connection?.status === "accepted";
  const sharingActive = Boolean(status?.sharing.enabled && !status.sharing.paused);
  const eyeState = sharingActive ? "active" : activeConnection ? "connected" : "normal";
  const partnerLocation = status?.partnerLocation ? { latitude: status.partnerLocation.latitude, longitude: status.partnerLocation.longitude, accuracy: status.partnerLocation.accuracy } : null;
  const mapCenter = userLocation ?? partnerLocation ?? { latitude: 40.7128, longitude: -74.006 };
  const lastUpdate = status?.partnerLocation?.updatedAt ? formatRelative(status.partnerLocation.updatedAt) : "Waiting for a shared signal";

  useEffect(() => {
    if (!sharingActive || !activeConnection) {
      if (geoState === "active") setGeoState("idle");
      return;
    }
    if (!navigator.geolocation) {
      setGeoState("unsupported");
      setGeoError("This browser does not expose geolocation.");
      return;
    }
    setGeoState("requesting");
    const watcher = navigator.geolocation.watchPosition(
      position => {
        const point = { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy };
        setUserLocation(point);
        setGeoState("active");
        const now = Date.now();
        if (now - lastPushAt.current > 15_000) {
          lastPushAt.current = now;
          pushLocation.mutate(point);
        }
      },
      errorValue => {
        setGeoState(errorValue.code === errorValue.PERMISSION_DENIED ? "denied" : "idle");
        setGeoError(errorValue.code === errorValue.PERMISSION_DENIED ? "Location permission was not granted. Sharing stays off." : "We could not read your location yet.");
      },
      { enableHighAccuracy: Boolean(status?.sharing.exact), maximumAge: 15_000, timeout: 20_000 },
    );
    return () => navigator.geolocation.clearWatch(watcher);
  }, [activeConnection, sharingActive, status?.sharing.exact]);

  useEffect(() => {
    if (!mapRef.current || !window.google || !mapReady) return;
    mapMarkers.current.forEach(marker => { marker.map = null; });
    mapMarkers.current = [];
    const points = [
      userLocation ? { point: userLocation, label: "You", className: "eye-user-marker" } : null,
      partnerLocation ? { point: partnerLocation, label: "Partner", className: "eye-partner-marker" } : null,
    ].filter(Boolean) as { point: Point; label: string; className: string }[];
    points.forEach(({ point, label, className }) => {
      const marker = new window.google.maps.marker.AdvancedMarkerElement({ map: mapRef.current, position: { lat: point.latitude, lng: point.longitude }, title: label, content: createMapMarker(label, className) });
      mapMarkers.current.push(marker);
    });
    if (points.length === 2) mapRef.current.fitBounds(new window.google.maps.LatLngBounds({ lat: points[0].point.latitude, lng: points[0].point.longitude }, { lat: points[1].point.latitude, lng: points[1].point.longitude }));
    else if (points.length === 1) mapRef.current.setCenter({ lat: points[0].point.latitude, lng: points[0].point.longitude });
  }, [mapReady, partnerLocation?.latitude, partnerLocation?.longitude, userLocation?.latitude, userLocation?.longitude]);

  const handleStartSharing = () => {
    if (!activeConnection) { toast.error("Accept a connection before sharing location."); return; }
    if (!navigator.geolocation) { setGeoState("unsupported"); setGeoError("This browser does not expose geolocation."); return; }
    setGeoState("requesting");
    navigator.geolocation.getCurrentPosition(
      position => {
        setUserLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy });
        updatePrivacy.mutate({ enabled: true, paused: false });
      },
      errorValue => {
        setGeoState(errorValue.code === errorValue.PERMISSION_DENIED ? "denied" : "idle");
        setGeoError(errorValue.code === errorValue.PERMISSION_DENIED ? "Location permission was not granted. Sharing stays off." : "We could not read your location yet.");
      },
      { enableHighAccuracy: Boolean(status?.sharing.exact), maximumAge: 0, timeout: 20_000 },
    );
  };
  const handleStopSharing = () => updatePrivacy.mutate({ enabled: false, paused: false });
  const handlePause = () => updatePrivacy.mutate({ paused: true });
  const handleResume = () => updatePrivacy.mutate({ paused: false, enabled: true });

  const copyCode = async () => {
    if (!status?.partnerCode) return;
    await navigator.clipboard?.writeText(status.partnerCode);
    toast.success("Eye code copied.");
  };

  if (isLoading) return <DashboardLayout><div className="min-h-screen p-6 sm:p-10"><div className="mx-auto max-w-6xl animate-pulse"><div className="h-5 w-28 rounded bg-white/10" /><div className="mt-5 h-14 w-80 rounded bg-white/10" /><div className="mt-10 h-64 rounded-3xl bg-white/5" /></div></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(106,52,193,.16),transparent_30rem)] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="mx-auto max-w-[1260px]">
          <DashboardHeader userName={user?.name} partnerCode={status?.partnerCode ?? "EYE—WAIT"} sharingActive={sharingActive} onCopy={copyCode} onRefresh={() => utils.connection.status.invalidate()} />
          {error && <div className="mt-6 rounded-2xl border border-rose-300/20 bg-rose-300/[0.06] p-4 text-sm text-rose-200">The Eye could not load your connection room. Please refresh and try again.</div>}
          {view === "overview" && <OverviewView status={status} eyeState={eyeState} userLocation={userLocation} partnerLocation={partnerLocation} mapCenter={mapCenter} mapReady={mapReady} mapRef={mapRef} onMapReady={map => { mapRef.current = map; setMapReady(true); }} lastUpdate={lastUpdate} sharingActive={sharingActive} geoState={geoState} geoError={geoError} onStartSharing={handleStartSharing} onStopSharing={handleStopSharing} onPause={handlePause} onResume={handleResume} onNavigate={navigate} />}
          {view === "connection" && <ConnectionView status={status} userId={user?.id} partnerCode={partnerCode} setPartnerCode={setPartnerCode} onRequest={() => requestConnection.mutate({ partnerCode })} isRequesting={requestConnection.isPending} onRespond={(connectionId, decision) => respondConnection.mutate({ connectionId, decision })} onNavigate={navigate} />}
          {view === "privacy" && <PrivacyView status={status} activeConnection={activeConnection} geoState={geoState} geoError={geoError} updatePending={updatePrivacy.isPending} onStart={handleStartSharing} onPause={handlePause} onResume={handleResume} onStop={handleStopSharing} onExactChange={exact => updatePrivacy.mutate({ exact })} onDisconnect={() => disconnectConnection.mutate()} />}
          {view === "activity" && <ActivityView status={status} userLocation={userLocation} lastUpdate={lastUpdate} />}
        </div>
      </div>
    </DashboardLayout>
  );
}

function DashboardHeader({ userName, partnerCode, sharingActive, onCopy, onRefresh }: { userName?: string | null; partnerCode: string; sharingActive: boolean; onCopy: () => void; onRefresh: () => void }) {
  return <div className="flex flex-col gap-6 border-b border-white/8 pb-8 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow mb-3 text-violet-200/70">THE EYE / YOUR ROOM</p><h1 className="font-[Space_Grotesk] text-4xl font-semibold tracking-[-0.055em] text-white sm:text-5xl">Good to see you<span className="text-violet-200">{userName ? `, ${userName.split(" ")[0]}` : ""}.</span></h1><p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">A private channel for two. Everything below is visible only after a connection is accepted.</p></div><div className="flex flex-wrap items-center gap-3"><div className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.15em] ${sharingActive ? "border-emerald-200/20 bg-emerald-300/[0.06] text-emerald-100" : "border-white/10 bg-white/[0.03] text-slate-500"}`}><span className={`status-dot ${sharingActive ? "" : "off"}`} />{sharingActive ? "Location sharing on" : "Location sharing off"}</div><button onClick={onRefresh} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-400 transition hover:border-violet-200/25 hover:text-white" aria-label="Refresh room"><RefreshCw className="h-4 w-4" /></button><button onClick={onCopy} className="inline-flex h-9 items-center gap-2 rounded-lg border border-violet-200/15 bg-violet-300/[0.06] px-3 font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.13em] text-violet-100 transition hover:bg-violet-300/10"><span>{partnerCode}</span><Copy className="h-3.5 w-3.5" /></button></div></div>;
}

function OverviewView({ status, eyeState, userLocation, partnerLocation, mapCenter, mapReady, mapRef, onMapReady, lastUpdate, sharingActive, geoState, geoError, onStartSharing, onStopSharing, onPause, onResume, onNavigate }: { status: any; eyeState: "normal" | "connected" | "active"; userLocation: Point | null; partnerLocation: Point | null; mapCenter: Point; mapReady: boolean; mapRef: React.MutableRefObject<google.maps.Map | null>; onMapReady: (map: google.maps.Map) => void; lastUpdate: string; sharingActive: boolean; geoState: string; geoError: string; onStartSharing: () => void; onStopSharing: () => void; onPause: () => void; onResume: () => void; onNavigate: (path: string) => void }) {
  const distance = userLocation && partnerLocation ? calculateDistance(userLocation, partnerLocation) : "—";
  return <div className="space-y-7 pt-8"><div className="grid gap-5 lg:grid-cols-[1.45fr_.75fr]"><div className="glass-panel relative min-h-[460px] overflow-hidden rounded-[28px] p-6 sm:p-8"><div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_32%,rgba(94,46,185,.20),transparent_38%)]" /><div className="relative flex items-start justify-between"><div><p className="eyebrow mb-2 text-cyan-200/70">Signal field</p><h2 className="font-[Space_Grotesk] text-2xl font-semibold text-white">Where the connection lives.</h2></div><div className="flex items-center gap-2 font-[JetBrains_Mono] text-[9px] uppercase tracking-[0.16em] text-slate-600"><span className="status-dot off" /> {mapReady ? "Map ready" : "Standby"}</div></div><div className="relative mt-3 h-[320px] overflow-hidden rounded-2xl border border-white/10">{(userLocation || partnerLocation) ? <MapView className="h-full" initialCenter={{ lat: mapCenter.latitude, lng: mapCenter.longitude }} initialZoom={11} onMapReady={onMapReady} /> : <div className="map-grid h-full"><div className="absolute inset-0 flex flex-col items-center justify-center text-center"><div className="mb-5 grid h-14 w-14 place-items-center rounded-full border border-violet-200/20 bg-violet-300/[0.07] text-violet-200"><Crosshair className="h-6 w-6" /></div><p className="font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.2em] text-violet-100/80">Location layer on standby</p><p className="mt-2 max-w-xs text-xs leading-5 text-slate-500">Your map appears here after you explicitly start sharing. No location is requested while sharing is off.</p></div><div className="absolute left-[18%] top-[22%] h-px w-[60%] bg-gradient-to-r from-transparent via-cyan-200/35 to-transparent" /><div className="absolute bottom-[22%] left-[10%] h-px w-[72%] rotate-[24deg] bg-gradient-to-r from-transparent via-violet-200/25 to-transparent" /></div>}</div><div className="relative mt-4 flex flex-wrap items-center justify-between gap-3 font-[JetBrains_Mono] text-[9px] uppercase tracking-[0.15em] text-slate-500"><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-cyan-200 shadow-[0_0_12px_rgba(126,234,255,.8)]" /> You {userLocation ? "visible" : "not sharing"}</span><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-fuchsia-200 shadow-[0_0_12px_rgba(239,149,255,.8)]" /> Partner {partnerLocation ? "visible" : "not sharing"}</span><span>{distance} {distance === "—" ? "" : "km apart"}</span></div></div><div className="flex flex-col gap-5"><div className="glass-panel flex min-h-[260px] flex-col items-center justify-center rounded-[28px] p-5 text-center"><div className="scale-[.62] sm:scale-[.68]"><EyeCore state={eyeState} size="compact" /></div><p className="eyebrow -mt-5 text-violet-200/70">Eye status</p><h3 className="mt-2 font-[Space_Grotesk] text-xl font-medium text-white">{eyeState === "active" ? "The Eye is watching" : eyeState === "connected" ? "Connection established" : "Awaiting your person"}</h3><p className="mt-2 text-xs text-slate-500">{sharingActive ? "Your signal is visible to your partner." : "Your signal is currently private."}</p></div><div className="grid grid-cols-2 gap-3">{[{ label: "Connection", value: status?.connection?.status === "accepted" ? "Connected" : status?.connection?.status === "pending" ? "Pending" : "Not connected", icon: Link2 }, { label: "Last update", value: lastUpdate, icon: Radio }, { label: "Distance", value: distance === "—" ? "—" : `${distance} km`, icon: MapPin }, { label: "Visibility", value: status?.sharing.exact ? "Exact" : "Approximate", icon: Fingerprint }].map(stat => <div key={stat.label} className="rounded-2xl border border-white/8 bg-white/[0.025] p-4"><stat.icon className="h-4 w-4 text-violet-200/70" /><p className="mt-5 font-[JetBrains_Mono] text-[9px] uppercase tracking-[0.14em] text-slate-600">{stat.label}</p><p className="mt-1 truncate text-sm text-slate-200">{stat.value}</p></div>)}</div></div></div><SharingCard active={sharingActive} paused={Boolean(status?.sharing.paused)} exact={Boolean(status?.sharing.exact)} geoState={geoState} geoError={geoError} onStart={onStartSharing} onStop={onStopSharing} onPause={onPause} onResume={onResume} onPrivacy={() => onNavigate("/app/privacy")} /><div className="grid gap-5 md:grid-cols-3"><MiniInsight icon={ShieldCheck} eyebrow="Privacy posture" title="Visible by design" copy="A bright status tells you when your location is being shared." /><MiniInsight icon={Users} eyebrow="Two-person room" title="No public map" copy="The room is only meaningful after both people accept." /><MiniInsight icon={Wifi} eyebrow="Browser ready" title={geoState === "active" ? "Signal received" : "Permission gated"} copy={geoState === "active" ? "Your browser is sending consented updates." : "Location permission stays untouched until you start."} /></div></div>;
}

function SharingCard({ active, paused, exact, geoState, geoError, onStart, onStop, onPause, onResume, onPrivacy }: { active: boolean; paused: boolean; exact: boolean; geoState: string; geoError: string; onStart: () => void; onStop: () => void; onPause: () => void; onResume: () => void; onPrivacy: () => void }) {
  return <div className={`glass-panel rounded-[24px] p-5 sm:p-6 ${active ? "border-emerald-200/20" : ""}`}><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-4"><div className={`mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${active ? "bg-emerald-300/10 text-emerald-200" : "bg-white/[0.04] text-slate-500"}`}>{active ? <Radio className="h-5 w-5" /> : <LockKeyhole className="h-5 w-5" />}</div><div><p className="eyebrow mb-1 text-emerald-200/70">Location sharing</p><h3 className="font-[Space_Grotesk] text-xl font-medium text-white">{active ? paused ? "Paused for now" : "LOCATION SHARING ON" : "LOCATION SHARING OFF"}</h3><p className="mt-1 max-w-lg text-sm leading-6 text-slate-500">{active ? exact ? "Your exact browser location is visible to your connected partner." : "An approximate location is visible to your connected partner." : "Nothing is being shared. Start only when it feels right."}</p>{geoError && <p className="mt-2 text-xs text-rose-200/80">{geoError}</p>}</div></div><div className="flex flex-wrap items-center gap-2 sm:justify-end">{!active && <Button onClick={onStart} disabled={geoState === "requesting"} className="glow-button h-11 rounded-xl bg-emerald-300/15 px-4 text-emerald-100 hover:bg-emerald-300/25"><Play className="mr-2 h-4 w-4" />{geoState === "requesting" ? "Requesting…" : "Start sharing"}</Button>}{active && paused && <Button onClick={onResume} className="h-11 rounded-xl border border-emerald-200/20 bg-emerald-300/10 px-4 text-emerald-100 hover:bg-emerald-300/20"><Play className="mr-2 h-4 w-4" />Resume</Button>}{active && !paused && <Button onClick={onPause} className="h-11 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-slate-300 hover:bg-white/[0.08]"><Pause className="mr-2 h-4 w-4" />Pause</Button>}{active && <Button onClick={onStop} variant="ghost" className="h-11 rounded-xl px-3 text-rose-200 hover:bg-rose-300/10 hover:text-rose-100">Stop</Button>}<Button variant="ghost" onClick={onPrivacy} className="h-11 rounded-xl px-3 text-slate-500 hover:bg-white/[0.04] hover:text-white">Privacy controls</Button></div></div></div>;
}

function ConnectionView({ status, userId, partnerCode, setPartnerCode, onRequest, isRequesting, onRespond, onNavigate }: { status: any; userId?: number; partnerCode: string; setPartnerCode: (value: string) => void; onRequest: () => void; isRequesting: boolean; onRespond: (id: number, decision: "accepted" | "declined") => void; onNavigate: (path: string) => void }) {
  const connection = status?.connection;
  return <div className="grid gap-6 pt-8 lg:grid-cols-[1.05fr_.95fr]"><div className="glass-panel rounded-[28px] p-6 sm:p-8"><p className="eyebrow mb-4 text-violet-200/70">Connection protocol</p><h2 className="font-[Space_Grotesk] text-3xl font-semibold tracking-[-0.04em] text-white">Find your person.</h2><p className="mt-3 max-w-md text-sm leading-6 text-slate-500">Use their unique Eye code to send an invitation. Sharing stays disabled until they accept.</p><div className="mt-8 rounded-2xl border border-violet-200/15 bg-violet-300/[0.04] p-5"><p className="font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.16em] text-violet-200/70">Your Eye code</p><div className="mt-3 flex items-center justify-between gap-3"><span className="font-[Space_Grotesk] text-2xl tracking-[0.12em] text-white">{status?.partnerCode ?? "EYE—WAIT"}</span><span className="inline-flex items-center gap-2 text-[10px] text-emerald-200"><Check className="h-3.5 w-3.5" /> Private</span></div></div><div className="mt-7 space-y-3"><Label htmlFor="partner-code" className="font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.16em] text-slate-500">Their unique code</Label><div className="flex flex-col gap-3 sm:flex-row"><Input id="partner-code" value={partnerCode} onChange={event => setPartnerCode(event.target.value.toUpperCase())} placeholder="EYE-7X92K" className="h-12 rounded-xl border-white/10 bg-white/[0.04] font-[JetBrains_Mono] tracking-[0.16em] text-white placeholder:text-slate-700" /><Button onClick={onRequest} disabled={isRequesting || partnerCode.length < 4} className="glow-button h-12 rounded-xl bg-violet-500 px-5 text-white hover:bg-violet-400">{isRequesting ? "Sending…" : "Connect"}<Link2 className="ml-2 h-4 w-4" /></Button></div></div></div><div className="space-y-6"><div className="glass-panel rounded-[28px] p-6 sm:p-8"><p className="eyebrow mb-4 text-cyan-200/70">Current state</p>{connection ? <div><div className="flex items-center gap-3"><div className={`grid h-11 w-11 place-items-center rounded-2xl ${connection.status === "accepted" ? "bg-emerald-300/10 text-emerald-200" : "bg-violet-300/10 text-violet-200"}`}>{connection.status === "accepted" ? <Users className="h-5 w-5" /> : <Radio className="h-5 w-5" />}</div><div><h3 className="font-[Space_Grotesk] text-xl text-white">{connection.status === "accepted" ? "Connection established" : connection.status === "pending" ? "Request in orbit" : "Connection closed"}</h3><p className="mt-1 text-sm text-slate-500">{status?.partner?.name ? `Connected with ${status.partner.name}.` : "Your partner will see this request in their room."}</p></div></div>{connection.status === "accepted" && <div className="mt-7 rounded-2xl border border-emerald-200/15 bg-emerald-300/[0.04] p-4 text-sm leading-6 text-emerald-100/80"><ShieldCheck className="mb-2 h-4 w-4" />Both people have accepted. Location sharing is still off until you explicitly start it.</div>}{connection.status === "pending" && (connection.requestedBy !== userId ? <div className="mt-7 space-y-3"><p className="text-sm leading-6 text-slate-400">Someone wants to connect their Eye with yours.</p><div className="flex flex-wrap gap-2"><Button onClick={() => onRespond(connection.id, "accepted")} className="h-10 rounded-xl bg-emerald-300/15 text-emerald-100 hover:bg-emerald-300/25">Accept</Button><Button onClick={() => onRespond(connection.id, "declined")} variant="ghost" className="h-10 rounded-xl text-rose-200 hover:bg-rose-300/10">Decline</Button></div></div> : <div className="mt-7 space-y-3"><p className="text-sm leading-6 text-slate-400">Connection request sent. The other person’s decision is still private to them.</p></div>)}</div> : <div className="py-8 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.03] text-slate-600"><UserRound className="h-6 w-6" /></div><h3 className="mt-5 font-[Space_Grotesk] text-xl text-white">No connection yet</h3><p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-500">Send an Eye code to create a room for two.</p></div>}</div><div className="rounded-[28px] border border-white/8 bg-white/[0.02] p-6"><p className="eyebrow mb-3 text-rose-200/60">The promise</p><p className="font-[Space_Grotesk] text-xl leading-8 text-slate-200">“No connection becomes active by accident.”</p><p className="mt-3 text-xs leading-5 text-slate-600">You can disconnect any time. The other person’s location is never visible outside an accepted connection.</p></div></div></div>;
}

function PrivacyView({ status, activeConnection, geoState, geoError, updatePending, onStart, onPause, onResume, onStop, onExactChange, onDisconnect }: { status: any; activeConnection: boolean; geoState: string; geoError: string; updatePending: boolean; onStart: () => void; onPause: () => void; onResume: () => void; onStop: () => void; onExactChange: (value: boolean) => void; onDisconnect: () => void }) {
  const sharing = status?.sharing;
  return <div className="grid gap-6 pt-8 lg:grid-cols-[.9fr_1.1fr]"><div><p className="eyebrow mb-4 text-emerald-200/70">Privacy controls</p><h2 className="font-[Space_Grotesk] text-4xl font-semibold tracking-[-0.05em] text-white">You decide<br /><span className="text-emerald-200">when you’re seen.</span></h2><p className="mt-5 max-w-md text-sm leading-7 text-slate-500">Location access is a permission, not a default. Every switch below updates the room’s visible state.</p><div className="mt-8 rounded-2xl border border-emerald-200/15 bg-emerald-300/[0.04] p-5"><div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-200" /><p className="text-sm leading-6 text-emerald-100/80">THE EYE does not track you secretly. Browser geolocation is requested only after you press “Start sharing.”</p></div></div></div><div className="glass-panel rounded-[28px] p-6 sm:p-8"><div className="flex items-center justify-between border-b border-white/8 pb-6"><div><p className="eyebrow text-violet-200/70">Visibility state</p><h3 className="mt-2 font-[Space_Grotesk] text-2xl text-white">{sharing?.enabled && !sharing?.paused ? "LOCATION SHARING ON" : sharing?.paused ? "SHARING PAUSED" : "LOCATION SHARING OFF"}</h3></div><div className={`status-dot ${sharing?.enabled && !sharing?.paused ? "" : "off"}`} /></div><div className="divide-y divide-white/8"><PrivacyRow icon={Radio} label="Location sharing" description={activeConnection ? "Your partner can see a live signal." : "Accept a connection before sharing."} value={Boolean(sharing?.enabled && !sharing?.paused)} disabled={!activeConnection || updatePending} onChange={value => value ? onStart() : onStop()} /><PrivacyRow icon={Crosshair} label="Share exact location" description="Off shares a coarse location instead." value={Boolean(sharing?.exact)} disabled={!activeConnection || updatePending} onChange={onExactChange} /></div><div className="mt-7 flex flex-wrap gap-3">{sharing?.enabled && !sharing?.paused && <Button onClick={onPause} disabled={updatePending} className="h-11 rounded-xl border border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"><Pause className="mr-2 h-4 w-4" />Pause sharing</Button>}{sharing?.paused && <Button onClick={onResume} disabled={updatePending} className="h-11 rounded-xl bg-emerald-300/15 text-emerald-100 hover:bg-emerald-300/25"><Play className="mr-2 h-4 w-4" />Resume sharing</Button>}{sharing?.enabled && <Button onClick={onStop} disabled={updatePending} variant="ghost" className="h-11 rounded-xl text-rose-200 hover:bg-rose-300/10">Stop sharing</Button>}</div>{geoError && <p className="mt-4 text-xs text-rose-200/80">{geoError}</p>}<div className="mt-8 border-t border-white/8 pt-6"><p className="eyebrow mb-3 text-rose-200/60">Connection boundary</p><p className="text-sm leading-6 text-slate-400">Disconnecting closes the room and turns off your sharing state.</p><Button onClick={onDisconnect} variant="ghost" className="mt-3 h-10 px-0 text-rose-200 hover:bg-transparent hover:text-rose-100"><X className="mr-2 h-4 w-4" />Disconnect partner</Button></div></div></div>;
}

function PrivacyRow({ icon: Icon, label, description, value, disabled, onChange }: { icon: typeof Radio; label: string; description: string; value: boolean; disabled: boolean; onChange: (value: boolean) => void }) { return <div className="flex items-center justify-between gap-5 py-5"><div className="flex items-start gap-3"><div className="mt-0.5 grid h-9 w-9 place-items-center rounded-xl bg-white/[0.04] text-violet-200/70"><Icon className="h-4 w-4" /></div><div><p className="text-sm text-white">{label}</p><p className="mt-1 max-w-xs text-xs leading-5 text-slate-600">{description}</p></div></div><Switch checked={value} disabled={disabled} onCheckedChange={onChange} className="data-[state=checked]:bg-emerald-400" /></div>; }

function ActivityView({ status, userLocation, lastUpdate }: { status: any; userLocation: Point | null; lastUpdate: string }) { return <div className="pt-8"><div className="glass-panel rounded-[28px] p-6 sm:p-8"><div className="flex flex-col gap-3 border-b border-white/8 pb-7 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow mb-3 text-cyan-200/70">Activity signal</p><h2 className="font-[Space_Grotesk] text-3xl font-semibold tracking-[-0.04em] text-white">A quiet record.</h2><p className="mt-2 text-sm text-slate-500">Only consented system events are shown here. No social feed, no public trail.</p></div><Activity className="h-7 w-7 text-violet-200/60" /></div><div className="grid gap-4 py-8 sm:grid-cols-3"><ActivityStat label="Your browser signal" value={userLocation ? "Received" : "Not shared"} tone={userLocation ? "green" : "muted"} /><ActivityStat label="Partner signal" value={status?.partnerLocation ? "Received" : "Waiting"} tone={status?.partnerLocation ? "violet" : "muted"} /><ActivityStat label="Last partner update" value={lastUpdate} tone="cyan" /></div><div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5"><p className="font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.16em] text-slate-600">Room log</p><div className="mt-5 flex items-center gap-3 text-sm text-slate-400"><span className="status-dot off" />No additional activity recorded yet.</div><p className="mt-3 pl-5 text-xs leading-5 text-slate-600">When updates arrive, this area will show their time and sharing state—not a movement history.</p></div></div></div>; }

function ActivityStat({ label, value, tone }: { label: string; value: string; tone: "green" | "violet" | "cyan" | "muted" }) { const toneClass = tone === "green" ? "text-emerald-200" : tone === "violet" ? "text-violet-200" : tone === "cyan" ? "text-cyan-200" : "text-slate-300"; return <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-5"><p className="font-[JetBrains_Mono] text-[9px] uppercase tracking-[0.15em] text-slate-600">{label}</p><p className={`mt-3 font-[Space_Grotesk] text-xl ${toneClass}`}>{value}</p></div>; }

function MiniInsight({ icon: Icon, eyebrow, title, copy }: { icon: typeof ShieldCheck; eyebrow: string; title: string; copy: string }) { return <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5"><Icon className="h-5 w-5 text-violet-200/70" /><p className="eyebrow mt-5 text-[9px] text-slate-600">{eyebrow}</p><h3 className="mt-2 font-[Space_Grotesk] text-lg text-white">{title}</h3><p className="mt-2 text-xs leading-5 text-slate-600">{copy}</p></div>; }

function calculateDistance(a: Point, b: Point) { const earthRadius = 6371; const dLat = ((b.latitude - a.latitude) * Math.PI) / 180; const dLon = ((b.longitude - a.longitude) * Math.PI) / 180; const lat1 = (a.latitude * Math.PI) / 180; const lat2 = (b.latitude * Math.PI) / 180; const value = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2); return (earthRadius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))).toFixed(1); }
function formatRelative(value: string | Date) { const then = new Date(value).getTime(); const seconds = Math.max(0, Math.round((Date.now() - then) / 1000)); if (seconds < 60) return `${seconds}s ago`; if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`; return `${Math.round(seconds / 3600)}h ago`; }
function createMapMarker(label: string, className: string) { const marker = document.createElement("div"); marker.className = `map-marker ${className}`; marker.setAttribute("aria-label", label); return marker; }
