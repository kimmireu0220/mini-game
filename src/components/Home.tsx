import { useEffect, useState } from "react";
import { GameCard, type GameEntry } from "./GameCard";
import "./Home.css";

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
    <main className="home">
      <div className="homeHeader">
        <h1 className="homeTitle">
          <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="" className="homeLogo" />
          - GAMES
        </h1>
        <button type="button" onClick={onNicknameChange} className="homeNicknameBtn">
          닉네임: {nickname}
        </button>
      </div>
      <div className="homeContent">
        <ul className="homeGrid">
          {slots.map((game, i) => (
            <li key={game ? game.slug : `empty-${currentPage}-${i}`} className="homeGridItem">
              {game ? <GameCard game={game} as="div" /> : <div className="homeGridEmpty" />}
            </li>
          ))}
        </ul>
        {showPagination && (
          <div className="homePagination">
            <button
              type="button"
              className="homePageBtn"
              disabled={currentPage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              이전
            </button>
            <span className="homePageInfo">
              {currentPage + 1} / {totalPages}
            </span>
            <button
              type="button"
              className="homePageBtn"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              다음
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
