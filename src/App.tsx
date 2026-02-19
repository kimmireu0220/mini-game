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
      <h1 style={{ fontSize: "1.75rem", marginBottom: "1.5rem" }}>미니게임 모음집</h1>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {games.map((g) => (
          <li key={g.slug} style={{ marginBottom: "1rem" }}>
            <Link
              to={`/games/${g.slug}/`}
              style={{ fontSize: "1.35rem", display: "inline-block", padding: "0.5rem 0" }}
            >
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
      <div style={{ padding: "1rem 1.25rem", background: "#16213e", minHeight: "52px", display: "flex", alignItems: "center" }}>
        <Link to="/" style={{ fontSize: "1.1rem", padding: "0.25rem 0" }}>← 목록</Link>
      </div>
      <iframe
        title={slug}
        src={`/games/${slug}/index.html`}
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
