import { useState } from "react";
import { Link } from "react-router-dom";
import "./GameCard.css";

export interface GameEntry {
  file: string;
  title: string;
  slug: string;
  icon?: string;
  description?: string;
}

const DEFAULT_ICON = "images/surprise-box.png";

interface GameCardProps {
  game: GameEntry;
  /** 그리드 셀 안에서 쓸 때 div로 렌더 (기본 li) */
  as?: "li" | "div";
}

export function GameCard({ game, as: Wrapper = "li" }: GameCardProps) {
  const [showInfo, setShowInfo] = useState(false);
  const base = import.meta.env.BASE_URL;
  const iconUrl = game.icon ? `${base}${game.icon}` : `${base}${DEFAULT_ICON}`;
  const description = game.description ?? "설명이 없습니다.";

  return (
    <Wrapper className="gameCardWrapper">
      <button
        type="button"
        aria-label="게임 설명"
        className="gameCardInfoBtn"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowInfo(true);
        }}
      >
        <img
          src={`${import.meta.env.BASE_URL}images/info-icon.png`}
          alt=""
          className="gameCardInfoIcon"
        />
      </button>
      <Link to={`/games/${game.slug}/`} className="gameCardLink">
        <img src={iconUrl} alt="" className="gameCardIcon" />
        <span className="gameCardTitle">{game.title}</span>
      </Link>
      {showInfo && (
        <>
          <div
            className="gameCardOverlay"
            onClick={() => setShowInfo(false)}
            aria-hidden
          />
          <div
            className="gameCardModal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="game-card-modal-title"
          >
            <div className="gameCardModalHeader">
              <h3 id="game-card-modal-title" className="gameCardModalTitle">
                {game.title}
              </h3>
              <button
                type="button"
                aria-label="닫기"
                onClick={() => setShowInfo(false)}
                className="gameCardModalClose"
              >
                <img
                  src={`${import.meta.env.BASE_URL}images/close-icon.png`}
                  alt=""
                  className="gameCardModalCloseIcon"
                />
              </button>
            </div>
            <p className="gameCardModalDesc">{description}</p>
          </div>
        </>
      )}
    </Wrapper>
  );
}
