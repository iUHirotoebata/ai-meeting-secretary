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
    accent: "bg-sky-500",
  },
  {
    title: "Google Calendar登録予定",
    description: "日時と参加者をカレンダーへ登録する想定です。",
    accent: "bg-emerald-500",
  },
  {
    title: "メール通知予定",
    description: "相手へ招待メールを送る想定です。",
    accent: "bg-cyan-500",
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
    <main className="min-h-screen bg-[#f7fbff] text-slate-950">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-lg border border-sky-100 bg-white px-5 py-6 shadow-sm sm:px-8 sm:py-8">
          <div className="max-w-3xl">
            <p className="text-sm font-bold text-emerald-700">
              会議調整を、話しかけるだけで。
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-normal text-slate-950 sm:text-5xl">
              江端AI秘書
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
              Zoom予約・カレンダー登録・メール通知を自動化する準備中のMVP
            </p>
          </div>
        </header>

        <div className="grid flex-1 gap-6 py-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
          <form
            onSubmit={handleSubmit}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft sm:p-7"
          >
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-bold text-slate-950">
                自然文で予定を入力
              </h2>
              <p className="text-sm leading-6 text-slate-500">
                先生、コンサル、コミュニティ運営者がいつもの言い方で予定を入れられる画面です。
              </p>
            </div>

            <label className="mt-6 block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                予定の内容
              </span>
              <textarea
                value={naturalInput}
                onChange={(event) => {
                  setNaturalInput(event.target.value);
                  setConfirmedDetails(null);
                }}
                placeholder={samplePrompt}
                className="min-h-44 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-base leading-8 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100"
              />
            </label>

            <div className="mt-5 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3">
              <p className="text-sm font-bold text-emerald-900">入力例</p>
              <p className="mt-1 text-sm leading-6 text-emerald-900">
                {samplePrompt}
              </p>
            </div>

            <button
              type="submit"
              disabled={!hasInput}
              className="mt-6 h-12 w-full rounded-lg bg-sky-700 px-6 text-sm font-bold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
            >
              確認する
            </button>
          </form>

          <aside className="space-y-6">
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">
                    仮抽出結果
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    入力文から画面上で仮に整理しています。
                  </p>
                </div>
                <span className="rounded-md bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
                  プレビュー
                </span>
              </div>

              <DetailsList details={extractedDetails} />
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">
                    確認画面
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    「確認する」後に確定前の内容を表示します。
                  </p>
                </div>
                <span
                  className={`rounded-md px-3 py-1 text-xs font-bold ${
                    confirmedDetails
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {confirmedDetails ? "確認済み" : "未確認"}
                </span>
              </div>

              {confirmedDetails ? (
                <DetailsList details={confirmedDetails} />
              ) : (
                <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 py-9 text-center">
                  <p className="text-sm font-semibold text-slate-600">
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

        <section className="grid gap-4 pb-8 sm:grid-cols-3">
          {statusCards.map((card) => (
            <div
              key={card.title}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className={`h-1.5 w-14 rounded-full ${card.accent}`} />
              <h3 className="mt-4 text-base font-bold text-slate-950">
                {card.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {card.description}
              </p>
              <p className="mt-4 inline-flex rounded-md bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                API連携は準備中
              </p>
            </div>
          ))}
        </section>
      </section>
    </main>
  );
}

function DetailsList({ details }: { details: MeetingDetails }) {
  return (
    <dl className="mt-6 divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
      {detailLabels.map(([key, label]) => (
        <div
          key={key}
          className="grid gap-1 bg-white px-4 py-3 sm:grid-cols-[132px_1fr]"
        >
          <dt className="text-sm font-semibold text-slate-500">{label}</dt>
          <dd className="break-words text-sm font-medium leading-6 text-slate-950">
            {details[key] || "未抽出"}
          </dd>
        </div>
      ))}
    </dl>
  );
}
