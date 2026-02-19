import { Routes, Route, Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";

interface GameEntry {
  file: string;
  title: string;
  slug: string;
}

function Home() {
  const [games, setGames] = useState<GameEntry[]>([]);

  useEffect(() => {
    fetch("/manifest.json")
      .then((r) => r.json())
      .then(setGames)
      .catch(() => setGames([]));
  }, []);

  return (
    <main style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
      <h1>미니게임 모음집</h1>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {games.map((g) => (
          <li key={g.slug} style={{ marginBottom: "0.75rem" }}>
            <Link to={`/games/${g.slug}/`} style={{ fontSize: "1.1rem" }}>
              {g.title}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

function GamePage() {
  const { slug } = useParams<{ slug: string }>();

  if (!slug) return null;

  return (
    <main style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "0.5rem 1rem", background: "#16213e" }}>
        <Link to="/">← 목록</Link>
      </div>
      <iframe
        title={slug}
        src={`/games/${slug}/`}
        style={{ flex: 1, border: "none", width: "100%" }}
      />
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/games/:slug/*" element={<GamePage />} />
    </Routes>
  );
}
