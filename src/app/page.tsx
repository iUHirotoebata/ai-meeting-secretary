"use client";

import { FormEvent, useMemo, useState } from "react";

type MeetingForm = {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  guestName: string;
  guestEmail: string;
  memo: string;
};

const initialForm: MeetingForm = {
  title: "",
  date: "",
  startTime: "",
  endTime: "",
  guestName: "",
  guestEmail: "",
  memo: "",
};

const fields = [
  {
    id: "title",
    label: "ミーティングタイトル",
    type: "text",
    placeholder: "例：導入相談ミーティング",
  },
  { id: "date", label: "日付", type: "date", placeholder: "" },
  { id: "startTime", label: "開始時間", type: "time", placeholder: "" },
  { id: "endTime", label: "終了時間", type: "time", placeholder: "" },
  {
    id: "guestName",
    label: "相手の名前",
    type: "text",
    placeholder: "例：山田 太郎",
  },
  {
    id: "guestEmail",
    label: "相手のメールアドレス",
    type: "email",
    placeholder: "taro@example.com",
  },
] as const;

const summaryLabels: Array<[keyof MeetingForm, string]> = [
  ["title", "タイトル"],
  ["date", "日付"],
  ["startTime", "開始時間"],
  ["endTime", "終了時間"],
  ["guestName", "相手の名前"],
  ["guestEmail", "メールアドレス"],
  ["memo", "メモ"],
];

export default function Home() {
  const [form, setForm] = useState<MeetingForm>(initialForm);
  const [isConfirming, setIsConfirming] = useState(false);

  const canSubmit = useMemo(
    () =>
      form.title &&
      form.date &&
      form.startTime &&
      form.endTime &&
      form.guestName &&
      form.guestEmail,
    [form],
  );

  const updateField = (key: keyof MeetingForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsConfirming(true);
  };

  return (
    <main className="min-h-screen bg-[#f6f7fb]">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 border-b border-slate-200 pb-6 pt-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-700">
              AI Meeting Secretary
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-normal text-slate-950 sm:text-5xl">
              ミーティング登録
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              日程、参加相手、メモをまとめて入力し、送信前に内容を確認できます。
            </p>
          </div>
          <div className="flex w-full max-w-sm items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm sm:w-auto">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <div>
              <p className="text-xs font-semibold text-slate-500">MVP</p>
              <p className="text-sm font-semibold text-slate-900">
                外部連携は次フェーズ
              </p>
            </div>
          </div>
        </header>

        <div className="grid flex-1 gap-6 py-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <form
            onSubmit={handleSubmit}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft sm:p-7"
          >
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  基本情報
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  必須項目を入力してください。
                </p>
              </div>
              <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                7項目
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map((field) => (
                <label
                  key={field.id}
                  className={
                    field.id === "title" || field.id === "guestEmail"
                      ? "sm:col-span-2"
                      : undefined
                  }
                >
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    {field.label}
                  </span>
                  <input
                    required
                    type={field.type}
                    value={form[field.id]}
                    placeholder={field.placeholder}
                    onChange={(event) =>
                      updateField(field.id, event.target.value)
                    }
                    className="h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-base outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  />
                </label>
              ))}

              <label className="sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  メモ
                </span>
                <textarea
                  value={form.memo}
                  placeholder="例：先方の課題、確認したいこと、次回アクションなど"
                  onChange={(event) => updateField("memo", event.target.value)}
                  className="min-h-32 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-base leading-7 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />
              </label>
            </div>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setForm(initialForm);
                  setIsConfirming(false);
                }}
                className="h-12 rounded-lg border border-slate-200 px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                クリア
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="h-12 rounded-lg bg-slate-950 px-6 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                入力内容を確認
              </button>
            </div>
          </form>

          <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  確認画面
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  送信ボタンを押すとここに表示されます。
                </p>
              </div>
              <span
                className={`rounded-md px-3 py-1 text-xs font-semibold ${
                  isConfirming
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {isConfirming ? "確認中" : "未確認"}
              </span>
            </div>

            {isConfirming ? (
              <div className="mt-6 divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
                {summaryLabels.map(([key, label]) => (
                  <div
                    key={key}
                    className="grid gap-1 bg-white px-4 py-3 sm:grid-cols-[120px_1fr]"
                  >
                    <dt className="text-sm font-semibold text-slate-500">
                      {label}
                    </dt>
                    <dd className="break-words text-sm font-medium leading-6 text-slate-950">
                      {form[key] || "未入力"}
                    </dd>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
                <p className="text-sm font-semibold text-slate-600">
                  まだ確認内容はありません
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  左のフォームを入力して、内容確認へ進んでください。
                </p>
              </div>
            )}

            <div className="mt-6 rounded-lg bg-[#eef7f2] p-4">
              <p className="text-sm font-bold text-emerald-900">
                将来の連携予定
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  "Google Calendar",
                  "Zoom API",
                  "Gmail",
                  "Google Contacts",
                  "Slack",
                ].map((service) => (
                  <span
                    key={service}
                    className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm"
                  >
                    {service}
                  </span>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
