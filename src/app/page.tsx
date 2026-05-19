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
    classes: "border-sky-200 bg-sky-50 text-sky-700",
  },
  {
    title: "Google Calendar登録予定",
    description: "日時と参加者をカレンダーへ登録する想定です。",
    classes: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  {
    title: "メール通知予定",
    description: "相手へ招待メールを送る想定です。",
    classes: "border-teal-200 bg-teal-50 text-teal-700",
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
    <main className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-emerald-50 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[960px] flex-col justify-center">
        <section className="overflow-hidden rounded-[32px] border border-white/70 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.16)]">
          <div className="border-b border-slate-100 bg-gradient-to-r from-sky-600 to-emerald-500 px-6 py-8 text-white sm:px-10 sm:py-10">
            <p className="inline-flex rounded-full bg-white/20 px-4 py-2 text-sm font-bold backdrop-blur">
              AI秘書 MVP
            </p>
            <h1 className="mt-5 text-4xl font-bold tracking-normal sm:text-6xl">
              江端AI秘書
            </h1>
            <p className="mt-4 text-xl font-bold sm:text-2xl">
              会議調整を、話しかけるだけで。
            </p>
            <p className="mt-4 max-w-2xl text-base leading-8 text-sky-50">
              Zoom予約・カレンダー登録・メール通知を自動化する準備中のMVPです。
            </p>
          </div>

          <div className="grid gap-6 bg-white p-5 sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:p-10">
            <form
              onSubmit={handleSubmit}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-6"
            >
              <div>
                <p className="text-sm font-bold text-sky-700">自然文入力</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-950">
                  AI秘書に予定を伝える
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  いつものメッセージのように入力すると、会議情報を仮整理します。
                </p>
              </div>

              <label className="mt-6 block">
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  予定の内容
                </span>
                <textarea
                  value={naturalInput}
                  onChange={(event) => {
                    setNaturalInput(event.target.value);
                    setConfirmedDetails(null);
                  }}
                  placeholder={samplePrompt}
                  className="min-h-[260px] w-full resize-y rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5 text-base leading-8 text-slate-950 shadow-inner shadow-slate-200/70 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </label>

              <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4">
                <p className="text-sm font-bold text-emerald-900">入力例</p>
                <p className="mt-2 text-sm leading-7 text-emerald-900">
                  {samplePrompt}
                </p>
              </div>

              <button
                type="submit"
                disabled={!hasInput}
                className="mt-6 h-14 w-full rounded-2xl bg-gradient-to-r from-sky-600 to-emerald-500 px-6 text-base font-bold text-white shadow-lg shadow-sky-700/25 transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-sky-200 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none disabled:hover:translate-y-0"
              >
                確認する
              </button>
            </form>

            <aside className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-emerald-700">
                      自動整理プレビュー
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-slate-950">
                      仮抽出結果
                    </h2>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-sky-700 shadow-sm">
                    プレビュー
                  </span>
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
                      確認するボタンを押すと、ここに内容が反映されます。
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
                  <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-9 text-center">
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
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          {statusCards.map((card) => (
            <div
              key={card.title}
              className={`rounded-3xl border p-5 shadow-[0_14px_40px_rgba(15,23,42,0.08)] ${card.classes}`}
            >
              <p className="text-base font-bold text-slate-950">{card.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {card.description}
              </p>
              <span className="mt-4 inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm">
                API連携は準備中
              </span>
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
    <dl className={`mt-5 grid gap-3 ${compact ? "" : "sm:grid-cols-2"}`}>
      {detailLabels.map(([key, label]) => (
        <div
          key={key}
          className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${
            key === "memo" && !compact ? "sm:col-span-2" : ""
          }`}
        >
          <dt className="text-xs font-bold text-slate-500">{label}</dt>
          <dd className="mt-2 break-words text-sm font-bold leading-6 text-slate-950">
            {details[key] || "未抽出"}
          </dd>
        </div>
      ))}
    </dl>
  );
}
