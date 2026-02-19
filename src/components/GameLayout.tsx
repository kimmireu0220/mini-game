import { useRef, useEffect, useState } from "react";

const BGM_MUTED_KEY = "mini_game_bgm_muted";

function getStoredBgmMuted(): boolean {
  try {
    return localStorage.getItem(BGM_MUTED_KEY) === "1";
  } catch {
    return false;
  }
}

function setStoredBgmMuted(muted: boolean) {
  try {
    localStorage.setItem(BGM_MUTED_KEY, muted ? "1" : "0");
  } catch {}
}

const FLOAT = 12;
const btnStyle: React.CSSProperties = {
  position: "absolute",
  top: FLOAT,
  zIndex: 10,
  width: 36,
  height: 36,
  padding: 0,
  border: "1px solid rgba(255,255,255,0.3)",
  borderRadius: 8,
  background: "rgba(255,255,255,0.15)",
  color: "#eee",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

interface GameLayoutProps {
  slug: string;
  iframeSrc: string;
}

export function GameLayout({ slug, iframeSrc }: GameLayoutProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [bgmMuted, setBgmMuted] = useState(getStoredBgmMuted);

  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const handleBgmToggle = () => {
    const next = !bgmMuted;
    setBgmMuted(next);
    setStoredBgmMuted(next);
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: "setBgmMuted", value: next },
        "*"
      );
    }
  };

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const onLoad = () => {
      iframe.contentWindow?.postMessage(
        { type: "setBgmMuted", value: bgmMuted },
        "*"
      );
    };
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "setBgmMuted" && typeof e.data.value === "boolean") {
        setBgmMuted(e.data.value);
        setStoredBgmMuted(e.data.value);
      }
    };
    iframe.addEventListener("load", onLoad);
    window.addEventListener("message", onMessage);
    return () => {
      iframe.removeEventListener("load", onLoad);
      window.removeEventListener("message", onMessage);
    };
  }, [bgmMuted]);

  const base = import.meta.env.BASE_URL;
  const reloadIconUrl = `${base}games/images/reload.png`;
  const bgmOnUrl = `${base}games/images/bgm-on.png`;
  const bgmOffUrl = `${base}games/images/bgm-off.png`;

  return (
    <main style={{ height: "100vh", position: "relative" }}>
      <iframe
        ref={iframeRef}
        title={slug}
        src={iframeSrc}
        style={{ position: "absolute", inset: 0, border: "none", width: "100%", height: "100%" }}
      />
      <button
        type="button"
        onClick={handleRefresh}
        title="새로고침"
        style={{ ...btnStyle, left: FLOAT }}
      >
        <img
          src={reloadIconUrl}
          alt="새로고침"
          style={{ width: 22, height: 22, display: "block" }}
        />
      </button>
      <button
        type="button"
        onClick={handleBgmToggle}
        title={bgmMuted ? "배경음악 켜기" : "배경음악 끄기"}
        style={{ ...btnStyle, right: FLOAT, left: "auto", opacity: bgmMuted ? 0.6 : 1 }}
      >
        <img
          src={bgmMuted ? bgmOffUrl : bgmOnUrl}
          alt="BGM"
          style={{ width: 22, height: 22, display: "block" }}
        />
      </button>
    </main>
  );
}
