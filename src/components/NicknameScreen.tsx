import { useState } from "react";
import { getStoredNickname, NICKNAME_KEY } from "../lib/nickname";
import "./NicknameScreen.css";

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
    <main className="nicknameRoot">
      <h1 className="nicknameTitle">
        <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="" className="nicknameLogo" />
        - GAMES
      </h1>
      <div className="nicknameContent">
        <form onSubmit={handleSubmit} className="nicknameForm">
          <label htmlFor="app-nickname" className="nicknameLabel">
            닉네임
          </label>
          <input
            id="app-nickname"
            type="text"
            maxLength={20}
            placeholder="닉네임 입력"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="nicknameInput"
          />
          {error && <p className="nicknameError">{error}</p>}
          <button type="submit" className="nicknameSubmit">
            시작하기
          </button>
        </form>
      </div>
    </main>
  );
}
