"use client";

import { FormEvent, useMemo, useState } from "react";

type MeetingDetails = {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  guestName: string;
  guestEmail: string;
  memo: string;
};

const samplePrompt =
  "5月27日 11:00〜11:30、田中さんとZoom。メールは tanaka@example.com";

const detailLabels: Array<[keyof MeetingDetails, string]> = [
  ["title", "会議タイトル"],
  ["date", "日付"],
  ["startTime", "開始時間"],
  ["endTime", "終了時間"],
  ["guestName", "相手の名前"],
  ["guestEmail", "相手のメール"],
  ["memo", "メモ"],
];

const statusCards = [
  {
    title: "Zoom作成予定",
    description: "確認後、Zoom URLを自動作成する想定です。",
    tone: "status-card-blue",
  },
  {
    title: "Google Calendar登録予定",
    description: "日時と参加者をカレンダーへ登録する想定です。",
    tone: "status-card-green",
  },
  {
    title: "メール通知予定",
    description: "相手へ招待メールを送る想定です。",
    tone: "status-card-teal",
  },
];

function normalizeTime(value: string) {
  const [hour, minute = "00"] = value.split(":");
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

function extractMeetingDetails(input: string): MeetingDetails {
  const email = input.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "";
  const dateMatch =
    input.match(/(\d{1,2})月\s*(\d{1,2})日/) ??
    input.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  const timeMatch = input.match(
    /(\d{1,2}:\d{2})\s*(?:〜|~|-|から)\s*(\d{1,2}:\d{2})/,
  );
  const guestMatch =
    input.match(/([一-龥ぁ-んァ-ヶーA-Za-z\s]{1,24})さん/) ??
    input.match(/([一-龥ぁ-んァ-ヶーA-Za-z\s]{1,24})(?:様|先生)/);
  const guestName = guestMatch?.[1]?.trim() ?? "";
  const mentionsZoom = /zoom/i.test(input);

  let date = "";
  if (dateMatch) {
    if (dateMatch.length === 3) {
      date = `${dateMatch[1]}月${dateMatch[2]}日`;
    } else {
      date = `${dateMatch[1]}年${dateMatch[2]}月${dateMatch[3]}日`;
    }
  }

  return {
    title: guestName
      ? `${guestName}さんとの${mentionsZoom ? "Zoom" : "会議"}`
      : mentionsZoom
        ? "Zoomミーティング"
        : "",
    date,
    startTime: timeMatch ? normalizeTime(timeMatch[1]) : "",
    endTime: timeMatch ? normalizeTime(timeMatch[2]) : "",
    guestName,
    guestEmail: email,
    memo: input.trim(),
  };
}

export default function Home() {
  const [naturalInput, setNaturalInput] = useState(samplePrompt);
  const [confirmedDetails, setConfirmedDetails] =
    useState<MeetingDetails | null>(null);

  const extractedDetails = useMemo(
    () => extractMeetingDetails(naturalInput),
    [naturalInput],
  );

  const hasInput = naturalInput.trim().length > 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setConfirmedDetails(extractedDetails);
  };

  return (
    <main className="app-shell">
      <div className="app-container">
        <section className="product-card">
          <header className="hero-panel">
            <p className="hero-badge">AI秘書 MVP</p>
            <h1 className="hero-title">江端AI秘書</h1>
            <p className="hero-subtitle">会議調整を、話しかけるだけで。</p>
            <p className="hero-description">
              Zoom予約・カレンダー登録・メール通知を自動化する準備中のMVPです。
            </p>
          </header>

          <div className="workspace-grid">
            <form onSubmit={handleSubmit} className="input-card">
              <div className="section-heading">
                <p className="eyebrow">自然文入力</p>
                <h2>AI秘書に予定を伝える</h2>
                <p>
                  いつものメッセージのように入力すると、会議情報を仮整理します。
                </p>
              </div>

              <label className="input-block">
                <span>予定の内容</span>
                <textarea
                  value={naturalInput}
                  onChange={(event) => {
                    setNaturalInput(event.target.value);
                    setConfirmedDetails(null);
                  }}
                  placeholder={samplePrompt}
                  className="natural-input"
                />
              </label>

              <div className="example-box">
                <p>入力例</p>
                <span>{samplePrompt}</span>
              </div>

              <button
                type="submit"
                disabled={!hasInput}
                className="confirm-button"
              >
                確認する
              </button>
            </form>

            <aside className="side-stack">
              <section className="result-card">
                <div className="result-header">
                  <div className="section-heading">
                    <p className="eyebrow eyebrow-green">自動整理プレビュー</p>
                    <h2>仮抽出結果</h2>
                  </div>
                  <span className="preview-pill">プレビュー</span>
                </div>

                <DetailsGrid details={extractedDetails} />
              </section>

              <section className="confirm-card">
                <div className="result-header">
                  <div className="section-heading compact-heading">
                    <h2>確認画面</h2>
                    <p>確認するボタンを押すと、ここに内容が反映されます。</p>
                  </div>
                  <span
                    className={`state-pill ${
                      confirmedDetails
                        ? "state-pill-confirmed"
                        : "state-pill-empty"
                    }`}
                  >
                    {confirmedDetails ? "確認済み" : "未確認"}
                  </span>
                </div>

                {confirmedDetails ? (
                  <DetailsGrid details={confirmedDetails} compact />
                ) : (
                  <div className="empty-state">
                    <p>まだ確認内容はありません</p>
                    <span>自然文を入力して「確認する」を押してください。</span>
                  </div>
                )}
              </section>
            </aside>
          </div>
        </section>

        <section className="status-grid">
          {statusCards.map((card) => (
            <div key={card.title} className={`status-card ${card.tone}`}>
              <p>{card.title}</p>
              <span>{card.description}</span>
              <strong>API連携は準備中</strong>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}

function DetailsGrid({
  details,
  compact = false,
}: {
  details: MeetingDetails;
  compact?: boolean;
}) {
  return (
    <dl className={`details-grid ${compact ? "details-grid-compact" : ""}`}>
      {detailLabels.map(([key, label]) => (
        <div
          key={key}
          className={`detail-item ${
            key === "memo" && !compact ? "detail-item-wide" : ""
          }`}
        >
          <dt>{label}</dt>
          <dd>{details[key] || "未抽出"}</dd>
        </div>
      ))}
    </dl>
  );
}
