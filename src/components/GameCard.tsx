import { useState } from "react";
import { Link } from "react-router-dom";

export interface GameEntry {
  file: string;
  title: string;
  slug: string;
}

function getCardIconUrl(slug: string): string | null {
  const base = import.meta.env.BASE_URL;
  if (slug === "timing-game") return `${base}games/timing-game/images/timing-game-icon.png`;
  if (slug === "updown-game") return `${base}games/updown-game/images/updown-game-icon.png`;
  return null;
}

function getGameDescription(slug: string): string {
  if (slug === "timing-game") {
    return "목표 초에 가깝게 버튼 누르기\n오차 적은 사람 1등";
  }
  if (slug === "updown-game") {
    return "업/다운 힌트로 비밀 숫자 맞추기\n빨리 정답 맞추면 1등";
  }
  return "";
}

const CARD_SIZE = 160;

const cardLinkStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.75rem",
  width: CARD_SIZE,
  height: CARD_SIZE,
  padding: "1rem",
  fontSize: "1.1rem",
  fontWeight: 500,
  color: "#eee",
  textDecoration: "none",
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: "12px",
  transition: "background 0.2s, border-color 0.2s",
  boxSizing: "border-box",
};

const infoBtnStyle: React.CSSProperties = {
  position: "absolute",
  top: 4,
  right: 4,
  minWidth: 44,
  minHeight: 44,
  width: 44,
  height: 44,
  padding: 0,
  borderRadius: "50%",
  border: "1px solid rgba(255,255,255,0.4)",
  background: "rgba(0,0,0,0.3)",
  color: "rgba(255,255,255,0.9)",
  fontSize: "0.85rem",
  fontWeight: 700,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 2,
};

interface GameCardProps {
  game: GameEntry;
}

export function GameCard({ game }: GameCardProps) {
  const [showInfo, setShowInfo] = useState(false);
  const iconUrl = getCardIconUrl(game.slug);
  const description = getGameDescription(game.slug);

  return (
    <li style={{ position: "relative" }}>
      <button
        type="button"
        aria-label="게임 설명"
        style={infoBtnStyle}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowInfo(true);
        }}
      >
        i
      </button>
      <Link
        to={`/games/${game.slug}/`}
        style={cardLinkStyle}
        onMouseOver={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.14)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.08)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
        }}
      >
        {iconUrl && (
          <img
            src={iconUrl}
            alt=""
            style={{ width: 56, height: 56, objectFit: "contain", flexShrink: 0 }}
          />
        )}
        <span style={{ textAlign: "center", lineHeight: 1.3 }}>{game.title}</span>
      </Link>
      {showInfo && (
        <>
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              zIndex: 100,
            }}
            onClick={() => setShowInfo(false)}
          />
          <div
            style={{
              position: "fixed",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: "90%",
              maxWidth: 340,
              padding: "1.75rem 1.5rem",
              paddingTop: "1rem",
              background: "linear-gradient(160deg, #1e2235 0%, #161a2b 50%, #13162a 100%)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 20,
              boxShadow: "0 24px 48px rgba(0,0,0,0.45), 0 0 0 1px rgba(127,200,168,0.08) inset",
              zIndex: 101,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1rem",
                paddingBottom: "0.75rem",
                borderBottom: "1px solid rgba(127,200,168,0.25)",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "1.2rem",
                  fontWeight: 600,
                  letterSpacing: "0.02em",
                  color: "#fff",
                }}
              >
                {game.title}
              </h3>
              <button
                type="button"
                aria-label="닫기"
                onClick={() => setShowInfo(false)}
                style={{
                  minWidth: 44,
                  minHeight: 44,
                  width: 44,
                  height: 44,
                  padding: 0,
                  border: "none",
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.12)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <img
                  src={`${import.meta.env.BASE_URL}images/close-icon.png`}
                  alt=""
                  style={{ width: 20, height: 20, objectFit: "contain", display: "block" }}
                />
              </button>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: "0.9rem",
                lineHeight: 1.8,
                color: "rgba(255,255,255,0.82)",
                whiteSpace: "pre-line",
                letterSpacing: "0.01em",
              }}
            >
              {description || "설명이 없습니다."}
            </p>
          </div>
        </>
      )}
    </li>
  );
}
