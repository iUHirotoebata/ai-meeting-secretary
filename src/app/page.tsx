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

const detailLabels: Array<[keyof MeetingDetails, string, string]> = [
  ["title", "会議タイトル", "bg-sky-50 text-sky-700"],
  ["date", "日付", "bg-emerald-50 text-emerald-700"],
  ["startTime", "開始時間", "bg-cyan-50 text-cyan-700"],
  ["endTime", "終了時間", "bg-teal-50 text-teal-700"],
  ["guestName", "相手の名前", "bg-blue-50 text-blue-700"],
  ["guestEmail", "相手のメール", "bg-slate-100 text-slate-700"],
  ["memo", "メモ", "bg-emerald-50 text-emerald-700"],
];

const statusCards = [
  {
    title: "Zoom作成予定",
    description: "確認後、Zoom URLを自動作成する想定です。",
    accent: "border-sky-200 bg-sky-50 text-sky-700",
    dot: "bg-sky-500",
  },
  {
    title: "Google Calendar登録予定",
    description: "日時と参加者をカレンダーへ登録する想定です。",
    accent: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  {
    title: "メール通知予定",
    description: "相手へ招待メールを送る想定です。",
    accent: "border-cyan-200 bg-cyan-50 text-cyan-700",
    dot: "bg-cyan-500",
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
    <main className="min-h-screen bg-white text-slate-950">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <header className="mx-auto w-full max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            AI秘書 MVP
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-normal text-slate-950 sm:text-6xl">
            江端AI秘書
          </h1>
          <p className="mt-4 text-xl font-bold leading-8 text-sky-800 sm:text-2xl">
            会議調整を、話しかけるだけで。
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            Zoom予約・カレンダー登録・メール通知を自動化する準備中のMVPです。
          </p>
        </header>

        <div className="mx-auto mt-9 w-full max-w-5xl rounded-[30px] border border-slate-200 bg-white p-3 shadow-[0_30px_100px_rgba(15,23,42,0.14)] sm:p-4">
          <div className="rounded-[24px] border border-sky-100 bg-sky-50/40 p-4 sm:p-6 lg:p-8">
            <div className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-start">
              <form
                onSubmit={handleSubmit}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="flex flex-col gap-3">
                  <span className="w-fit rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
                    予定入力
                  </span>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-950">
                      自然文で予定を入力
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      いつものメッセージ感覚で、日時・相手・通知先をまとめて入力できます。
                    </p>
                  </div>
                </div>

                <label className="mt-6 block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">
                    AI秘書への依頼内容
                  </span>
                  <textarea
                    value={naturalInput}
                    onChange={(event) => {
                      setNaturalInput(event.target.value);
                      setConfirmedDetails(null);
                    }}
                    placeholder={samplePrompt}
                    className="min-h-60 w-full resize-y rounded-3xl border border-slate-200 bg-white px-5 py-5 text-base leading-8 shadow-inner shadow-slate-100 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                  />
                </label>

                <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-4">
                  <p className="text-sm font-bold text-emerald-900">入力例</p>
                  <p className="mt-2 text-sm leading-7 text-emerald-900">
                    {samplePrompt}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={!hasInput}
                className="mt-6 h-14 w-full rounded-2xl bg-sky-700 px-6 text-base font-bold text-white shadow-lg shadow-sky-700/25 transition hover:-translate-y-0.5 hover:bg-sky-800 focus:outline-none focus:ring-4 focus:ring-sky-200 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none disabled:hover:translate-y-0"
                >
                  確認する
                </button>
              </form>

              <aside className="space-y-6">
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                        自動整理プレビュー
                      </span>
                      <h2 className="mt-3 text-2xl font-bold text-slate-950">
                        仮抽出結果
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        入力内容から、会議に必要な項目を整理します。
                      </p>
                    </div>
                  </div>

                  <DetailsGrid details={extractedDetails} />
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-950">
                        確認画面
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        「確認する」後に、確定前の内容を表示します。
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                        confirmedDetails
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {confirmedDetails ? "確認済み" : "未確認"}
                    </span>
                  </div>

                  {confirmedDetails ? (
                    <DetailsGrid details={confirmedDetails} compact />
                  ) : (
                    <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
                      <p className="text-sm font-bold text-slate-700">
                        まだ確認内容はありません
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        自然文を入力して「確認する」を押してください。
                      </p>
                    </div>
                  )}
                </section>
              </aside>
            </div>
          </div>
        </div>

        <section className="mx-auto mt-6 grid w-full max-w-5xl gap-4 pb-4 sm:grid-cols-3">
          {statusCards.map((card) => (
            <div
              key={card.title}
              className={`rounded-3xl border p-5 shadow-sm ${card.accent}`}
            >
              <div className="flex items-center gap-3">
                <span className={`h-3 w-3 rounded-full ${card.dot}`} />
                <h3 className="text-base font-bold text-slate-950">
                  {card.title}
                </h3>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {card.description}
              </p>
              <p className="mt-4 inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm">
                API連携は準備中
              </p>
            </div>
          ))}
        </section>
      </section>
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
    <dl
      className={`mt-6 grid gap-3 ${
        compact ? "sm:grid-cols-1" : "sm:grid-cols-2"
      }`}
    >
      {detailLabels.map(([key, label, tone]) => (
        <div
          key={key}
          className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-200 hover:shadow-md ${
            key === "memo" ? "sm:col-span-2" : ""
          } ${compact ? "sm:col-span-1" : ""}`}
        >
          <dt
            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${tone}`}
          >
            {label}
          </dt>
          <dd className="mt-3 break-words text-sm font-semibold leading-6 text-slate-950">
            {details[key] || "未抽出"}
          </dd>
        </div>
      ))}
    </dl>
  );
}
