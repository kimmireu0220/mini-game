import { useEffect, useState } from "react";
import { GameCard, type GameEntry } from "./GameCard";

interface HomeProps {
  nickname: string;
  onNicknameChange: () => void;
}

const PER_PAGE = 4;

export function Home({ nickname, onNicknameChange }: HomeProps) {
  const [games, setGames] = useState<GameEntry[]>([]);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    fetch(`${base}manifest.json`)
      .then((r) => r.json())
      .then((data: unknown) => setGames(Array.isArray(data) ? (data as GameEntry[]) : []))
      .catch(() => setGames([]));
  }, []);

  const totalPages = Math.max(1, Math.ceil(games.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages - 1);

  useEffect(() => {
    if (page >= totalPages && totalPages > 0) setPage(totalPages - 1);
  }, [totalPages, page]);
  const pageGames = games.slice(currentPage * PER_PAGE, currentPage * PER_PAGE + PER_PAGE);
  const showPagination = games.length > PER_PAGE;

  // 빈 슬롯까지 포함해 항상 4칸(2x2) 유지
  const emptySlots: (GameEntry | null)[] = Array.from(
    { length: PER_PAGE - pageGames.length },
    (): GameEntry | null => null
  );
  const slots: (GameEntry | null)[] = [...pageGames, ...emptySlots];

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", width: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.5rem 0", flexWrap: "wrap", gap: "0.5rem" }}>
        <h1 style={{ fontSize: "1.75rem", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="" style={{ height: "2rem", width: "auto", display: "block" }} />
          I-GAMES
        </h1>
        <button
          type="button"
          onClick={onNicknameChange}
          style={{ fontSize: "0.85rem", padding: "0.35rem 0.6rem", background: "rgba(255,255,255,0.15)", color: "#aaa", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "6px", cursor: "pointer" }}
        >
          닉네임: {nickname}
        </button>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "1rem 1.5rem 1.5rem 1.5rem", gap: "1.25rem" }}>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: "1rem", width: "100%", maxWidth: "340px" }}>
          {slots.map((game, i) => (
            <li key={game ? game.slug : `empty-${currentPage}-${i}`} style={{ minHeight: 160 }}>
              {game ? <GameCard game={game} as="div" /> : <div style={{ width: "100%", height: "100%", minHeight: 160 }} />}
            </li>
          ))}
        </ul>
        {showPagination && (
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button
              type="button"
              disabled={currentPage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              style={{
                padding: "0.5rem 1rem",
                fontSize: "0.9rem",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: "8px",
                background: currentPage === 0 ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.12)",
                color: currentPage === 0 ? "#666" : "#eee",
                cursor: currentPage === 0 ? "not-allowed" : "pointer",
              }}
            >
              이전
            </button>
            <span style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.8)" }}>
              {currentPage + 1} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              style={{
                padding: "0.5rem 1rem",
                fontSize: "0.9rem",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: "8px",
                background: currentPage >= totalPages - 1 ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.12)",
                color: currentPage >= totalPages - 1 ? "#666" : "#eee",
                cursor: currentPage >= totalPages - 1 ? "not-allowed" : "pointer",
              }}
            >
              다음
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
