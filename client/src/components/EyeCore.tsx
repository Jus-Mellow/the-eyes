import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type EyeState = "normal" | "searching" | "connected" | "active" | "off";

type EyeCoreProps = {
  state?: EyeState;
  size?: "hero" | "compact";
  pulseKey?: number;
  className?: string;
};

export default function EyeCore({ state = "normal", size = "hero", pulseKey = 0, className }: EyeCoreProps) {
  const [gaze, setGaze] = useState({ x: 0, y: 0 });
  const [blinking, setBlinking] = useState(false);
  const blinkTimeout = useRef<number | undefined>(undefined);

  const scheduleBlink = useCallback(() => {
    const delay = 3200 + Math.random() * 5700;
    blinkTimeout.current = window.setTimeout(() => {
      setBlinking(true);
      window.setTimeout(() => {
        setBlinking(false);
        if (Math.random() > 0.68) {
          window.setTimeout(() => {
            setBlinking(true);
            window.setTimeout(() => {
              setBlinking(false);
              scheduleBlink();
            }, 120);
          }, 145);
        } else {
          scheduleBlink();
        }
      }, 170 + Math.random() * 160);
    }, delay);
  }, []);

  useEffect(() => {
    scheduleBlink();
    return () => {
      if (blinkTimeout.current) window.clearTimeout(blinkTimeout.current);
    };
  }, [scheduleBlink]);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    setGaze({ x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) });
  };

  return (
    <div
      className={cn("relative flex items-center justify-center", size === "compact" ? "h-40 w-64" : "h-[clamp(250px,46vw,590px)] w-full", className)}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setGaze({ x: 0, y: 0 })}
      role="img"
      aria-label={`THE EYE is ${state === "active" ? "watching with location sharing active" : state === "off" ? "dimmed because vision is disabled" : state}`}
    >
      <div className="noise-overlay absolute inset-0 opacity-[0.08]" />
      <div className="absolute inset-0 flex items-center justify-center" key={pulseKey}>
        <div className="eye-ring" />
        <div className="eye-ring" />
        <div className="eye-ring" />
        <div className={cn("eye-socket", blinking && "is-blinking", state === "connected" && "connected", state === "active" && "active", state === "off" && "off", state === "searching" && "animate-signal")}>
          <div className="eye-lid top" />
          <div className="eye-lid bottom" />
          <div className="iris" style={{ transform: `translate(${gaze.x * 18}px, ${gaze.y * 12}px)` }}>
            <div className="pupil" style={{ transform: `translate(${gaze.x * 10}px, ${gaze.y * 8}px)` }} />
          </div>
          <div className="absolute left-[13%] top-[22%] font-[JetBrains_Mono] text-[9px] tracking-[0.28em] text-cyan-100/45">光</div>
          <div className="absolute bottom-[20%] right-[13%] font-[JetBrains_Mono] text-[10px] tracking-[0.28em] text-violet-200/50">視線</div>
          <div className="absolute bottom-[10%] left-[22%] h-px w-20 bg-gradient-to-r from-transparent via-cyan-200/50 to-transparent" />
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-12 w-3/4 -translate-x-1/2 bg-[radial-gradient(ellipse,rgba(104,226,255,.24),transparent_68%)] blur-xl" />
    </div>
  );
}
