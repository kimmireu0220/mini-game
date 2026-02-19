import { useState } from "react";
import { getStoredNickname, NICKNAME_KEY } from "../lib/nickname";

interface NicknameScreenProps {
  onDone: () => void;
}

export function NicknameScreen({ onDone }: NicknameScreenProps) {
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
      <h1 style={{ fontSize: "1.75rem", marginBottom: "1.5rem", padding: "2rem 2rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="" style={{ height: "2rem", width: "auto", display: "block" }} />
        I-GAMES
      </h1>
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
