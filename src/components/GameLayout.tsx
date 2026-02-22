import { useRef, useEffect, useState } from "react";
import "./GameLayout.css";

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
  const reloadIconUrl = `${base}images/reload.png`;
  const bgmOnUrl = `${base}images/bgm-on.png`;
  const bgmOffUrl = `${base}images/bgm-off.png`;

  return (
    <main className="gameLayoutRoot">
      <iframe
        ref={iframeRef}
        title={slug}
        src={iframeSrc}
        className="gameLayoutIframe"
      />
      <button
        type="button"
        onClick={handleRefresh}
        title="새로고침"
        className="gameLayoutBtn gameLayoutBtnLeft"
      >
        <img src={reloadIconUrl} alt="새로고침" className="gameLayoutBtnIcon" />
      </button>
      <button
        type="button"
        onClick={handleBgmToggle}
        title={bgmMuted ? "배경음악 켜기" : "배경음악 끄기"}
        className={`gameLayoutBtn gameLayoutBtnRight ${bgmMuted ? "gameLayoutBtnMuted" : ""}`}
      >
        <img
          src={bgmMuted ? bgmOffUrl : bgmOnUrl}
          alt="BGM"
          className="gameLayoutBtnIcon"
        />
      </button>
    </main>
  );
}
