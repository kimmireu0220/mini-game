import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { GameLayout } from "./GameLayout";

export function GamePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (slug !== "random-game") return;
    const base = import.meta.env.BASE_URL;
    fetch(`${base}manifest.json`)
      .then((r) => r.json())
      .then((data: unknown) => {
        const list = Array.isArray(data) ? (data as { slug: string }[]) : [];
        const real = list.filter((g) => g.slug && g.slug !== "random-game");
        const chosen = real[Math.floor(Math.random() * real.length)]?.slug;
        if (chosen) navigate(`/games/${chosen}/`, { replace: true });
      })
      .catch(() => {});
  }, [slug, navigate]);

  if (!slug) return null;
  if (slug === "random-game") return null;

  const base = import.meta.env.BASE_URL;
  const iframeSrc = `${base}games/${slug}/index.html`;

  return <GameLayout slug={slug} iframeSrc={iframeSrc} />;
}
