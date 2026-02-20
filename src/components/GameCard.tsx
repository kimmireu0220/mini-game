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
  if (slug === "number-order") return `${base}games/number-order/images/number-order-icon.jpg`;
  if (slug === "random-game" || slug === "temp-game") return `${base}images/surprise-box.png`;
  return null;
}

function getGameDescription(slug: string): string {
  if (slug === "timing-game") {
    return "목표 초에 가깝게 버튼 누르기\n오차 적은 사람 1등";
  }
  if (slug === "updown-game") {
    return "업/다운 힌트로 비밀 숫자 맞추기\n빨리 정답 맞추면 1등";
  }
  if (slug === "random-game") {
    return "게임 중 하나를 랜덤 선택\n선택된 게임으로 바로 플레이";
  }
  if (slug === "temp-game") return "임시 게임\n(추가 예정)";
  if (slug === "number-order") return "1부터 16까지 순서대로 빠르게 터치\n소요 시간 짧은 사람이 1등";
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
  fontSize: "1rem",
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
  right: 10,
  minWidth: 44,
  minHeight: 44,
  width: 44,
  height: 44,
  padding: 0,
  border: "none",
  background: "transparent",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 2,
};

interface GameCardProps {
  game: GameEntry;
  /** 그리드 셀 안에서 쓸 때 div로 렌더 (기본 li) */
  as?: "li" | "div";
}

export function GameCard({ game, as: Wrapper = "li" }: GameCardProps) {
  const [showInfo, setShowInfo] = useState(false);
  const iconUrl = getCardIconUrl(game.slug);
  const description = getGameDescription(game.slug);

  return (
    <Wrapper style={{ position: "relative" } as React.CSSProperties}>
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
        <img
          src={`${import.meta.env.BASE_URL}images/info-icon.png`}
          alt=""
          style={{ width: 24, height: 24, objectFit: "contain", display: "block" }}
        />
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
            style={{ width: 44, height: 44, objectFit: "contain", flexShrink: 0 }}
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
    </Wrapper>
  );
}
