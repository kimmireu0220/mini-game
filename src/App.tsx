import { Routes, Route, Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { GameLayout } from "./components/GameLayout";

const NICKNAME_KEY = "mini_game_nickname";

interface GameEntry {
  file: string;
  title: string;
  slug: string;
}

function getStoredNickname(): string {
  try {
    return localStorage.getItem(NICKNAME_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

function NicknameScreen({ onDone }: { onDone: () => void }) {
  const [value, setValue] = useState(getStoredNickname());
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nick = value.trim();
    if (!nick) {
      setError("닉네임을 입력해 주세요.");
      return;
    }
    if (nick.length > 20) {
      setError("닉네임은 20자 이내로 입력해 주세요.");
      return;
    }
    setError("");
    try {
      localStorage.setItem(NICKNAME_KEY, nick);
    } catch {}
    onDone();
  };

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", width: "100%", boxSizing: "border-box" }}>
      <h1 style={{ fontSize: "1.75rem", marginBottom: "1.5rem", padding: "2rem 2rem 0" }}>미니게임 모음집</h1>
      <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", padding: "2rem" }}>
        <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: "400px" }}>
          <label htmlFor="app-nickname" style={{ display: "block", marginBottom: "0.75rem", fontSize: "0.9rem" }}>
            닉네임
          </label>
          <input
            id="app-nickname"
            type="text"
            maxLength={20}
            placeholder="닉네임 입력"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: "8px",
              background: "rgba(255,255,255,0.08)",
              color: "#eee",
              fontSize: "1rem",
              marginBottom: "1rem",
            }}
          />
          {error && <p style={{ color: "#e88", fontSize: "0.9rem", marginBottom: "0.75rem" }}>{error}</p>}
          <button
            type="submit"
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "0.25rem",
              background: "#4a7c59",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            시작하기
          </button>
        </form>
      </div>
    </main>
  );
}

function Home({ nickname, onNicknameChange }: { nickname: string; onNicknameChange: () => void }) {
  const [games, setGames] = useState<GameEntry[]>([]);

  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    fetch(`${base}manifest.json`)
      .then((r) => r.json())
      .then(setGames)
      .catch(() => setGames([]));
  }, []);

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", width: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2rem 2rem 0", flexWrap: "wrap", gap: "0.5rem" }}>
        <h1 style={{ fontSize: "1.75rem", margin: 0 }}>미니게임 모음집</h1>
        <button
          type="button"
          onClick={onNicknameChange}
          style={{ fontSize: "0.85rem", padding: "0.35rem 0.6rem", background: "rgba(255,255,255,0.15)", color: "#aaa", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "6px", cursor: "pointer" }}
        >
          닉네임: {nickname}
        </button>
      </div>
      <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", padding: "2rem" }}>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "1rem", width: "100%", maxWidth: "400px" }}>
          {games.map((g) => {
            const base = import.meta.env.BASE_URL;
            const cardIcon =
              g.slug === "timing-game"
                ? `${base}games/timing-game/images/timing-game-icon.png`
                : g.slug === "updown-game"
                  ? `${base}games/updown-game/images/updown-game-icon.png`
                  : null;
            return (
              <li key={g.slug}>
                <Link
                  to={`/games/${g.slug}/`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    padding: "1.25rem 1.5rem",
                    fontSize: "1.25rem",
                    fontWeight: 500,
                    color: "#eee",
                    textDecoration: "none",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "12px",
                    transition: "background 0.2s, border-color 0.2s",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.14)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                  }}
                >
                  {cardIcon && (
                    <img
                      src={cardIcon}
                      alt=""
                      style={{ width: "48px", height: "48px", objectFit: "contain", flexShrink: 0 }}
                    />
                  )}
                  <span>{g.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}

function GamePage() {
  const { slug } = useParams<{ slug: string }>();

  if (!slug) return null;

  const base = import.meta.env.BASE_URL;
  const iframeSrc = `${base}games/${slug}/index.html`;

  return <GameLayout slug={slug} iframeSrc={iframeSrc} />;
}

function HomeGate() {
  const [nickname, setNickname] = useState<string>(() => getStoredNickname());

  const handleNicknameDone = () => setNickname(getStoredNickname());
  const handleNicknameChange = () => {
    try {
      localStorage.removeItem(NICKNAME_KEY);
    } catch {}
    setNickname("");
  };

  if (!nickname) return <NicknameScreen onDone={handleNicknameDone} />;
  return <Home nickname={nickname} onNicknameChange={handleNicknameChange} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeGate />} />
      <Route path="/games/:slug/*" element={<GamePage />} />
    </Routes>
  );
}
