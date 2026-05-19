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

type ExtractionResult = {
  details: MeetingDetails;
  missingMessages: string[];
  autoMessages: string[];
  needsConfirmation: boolean;
  isDateMissing: boolean;
  isStartTimeMissing: boolean;
  isEmailMissing: boolean;
  isEndTimeAutoCompleted: boolean;
};

type FollowUpInputs = Partial<
  Pick<MeetingDetails, "date" | "startTime" | "endTime" | "guestEmail">
>;

type ZoomCreateMeetingResponse = {
  ok: boolean;
  message: string;
  meeting?: {
    id: string;
    topic: string;
    startTime: string;
    duration: number;
    timezone: string;
    joinUrl: string;
  };
};

type CreatedZoomMeeting = NonNullable<ZoomCreateMeetingResponse["meeting"]>;

const samplePrompt =
  "5月27日 11:00〜11:30、田中さんとZoom。メールは tanaka@example.com";

const detailLabels: Array<[keyof MeetingDetails, string]> = [
  ["title", "会議タイトル"],
  ["date", "日付"],
  ["startTime", "開始時間"],
  ["endTime", "終了時間"],
  ["guestName", "相手の名前"],
  ["guestEmail", "相手のメール"],
];

const statusCards = [
  {
    title: "Zoom作成準備",
    description: "確認後、この内容でZoomミーティングを作成します。",
    tone: "status-card-blue",
  },
  {
    title: "カレンダー自動連携確認",
    description:
      "Zoom作成後、ceo@hirotoebata.jp の連携カレンダーへ自動反映される想定です。",
    tone: "status-card-green",
  },
  {
    title: "招待メール送信準備",
    description: "自分と相手へZoom URL付きの招待メールを送る想定です。",
    tone: "status-card-teal",
  },
];

function normalizeTime(value: string) {
  const normalizedValue = normalizeInput(value)
    .replace("時", ":")
    .replace("分", "");
  const [hour, minute = "00"] = normalizedValue.split(":");
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

function normalizeInput(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[〜～]/g, "~")
    .replace(/[‐‑‒–—―－]/g, "-")
    .replace(/：/g, ":");
}

function addOneHour(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return `${String((hour + 1) % 24).padStart(2, "0")}:${String(
    minute,
  ).padStart(2, "0")}`;
}

function extractTimes(input: string) {
  const timePattern = String.raw`\d{1,2}(?::\d{2}|時(?:\d{1,2}分?)?)?`;
  const rangeMatch = input.match(
    new RegExp(`(${timePattern})\\s*(?:〜|~|-|から)\\s*(${timePattern})`),
  );

  if (rangeMatch) {
    return {
      startTime: normalizeTime(rangeMatch[1]),
      endTime: normalizeTime(rangeMatch[2]),
      autoCompletedEndTime: false,
    };
  }

  const singleTimeMatch = input.match(/(\d{1,2}:\d{2}|\d{1,2}時(?:\d{1,2}分?)?)/);
  if (singleTimeMatch) {
    const startTime = normalizeTime(singleTimeMatch[1]);
    return {
      startTime,
      endTime: addOneHour(startTime),
      autoCompletedEndTime: true,
    };
  }

  return {
    startTime: "",
    endTime: "",
    autoCompletedEndTime: false,
  };
}

function cleanTimeInput(value: string | undefined) {
  return value?.trim() ? normalizeTime(value.trim()) : "";
}

function extractDate(input: string) {
  const yearTextMatch = input.match(/(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/);
  if (yearTextMatch) {
    return `${yearTextMatch[1]}年${yearTextMatch[2]}月${yearTextMatch[3]}日`;
  }

  const yearSlashMatch = input.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (yearSlashMatch) {
    return `${yearSlashMatch[1]}年${yearSlashMatch[2]}月${yearSlashMatch[3]}日`;
  }

  const monthDayTextMatch = input.match(/(\d{1,2})月\s*(\d{1,2})日/);
  if (monthDayTextMatch) {
    return `${monthDayTextMatch[1]}月${monthDayTextMatch[2]}日`;
  }

  const monthDaySlashMatch = input.match(/(?:^|[^\d])(\d{1,2})[/-](\d{1,2})(?=$|[^\d])/);
  if (monthDaySlashMatch) {
    return `${monthDaySlashMatch[1]}月${monthDaySlashMatch[2]}日`;
  }

  return "";
}

function extractMemo(input: string) {
  const memoMatch = input.match(/(?:メモ|備考)\s*(?:は|:|：)\s*(.+)$/);
  return memoMatch?.[1]?.trim() ?? "";
}

function extractMeetingDetails(
  input: string,
  followUps: FollowUpInputs = {},
): ExtractionResult {
  const normalizedInput = normalizeInput(input);
  const email =
    normalizedInput.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "";
  const date = extractDate(normalizedInput);
  const extractedTimes = extractTimes(normalizedInput);
  const guestMatch =
    normalizedInput.match(/([一-龥ぁ-んァ-ヶーA-Za-z\s]{1,24})さん/) ??
    normalizedInput.match(/([一-龥ぁ-んァ-ヶーA-Za-z\s]{1,24})(?:様|先生)/);
  const guestName = guestMatch?.[1]?.trim() ?? "";
  const mentionsZoom = /zoom/i.test(normalizedInput);
  const memo = extractMemo(input);

  const followUpStartTime = cleanTimeInput(followUps.startTime);
  const followUpEndTime = cleanTimeInput(followUps.endTime);
  const finalDate = followUps.date?.trim() || date;
  const finalStartTime = followUpStartTime || extractedTimes.startTime;
  let finalEndTime = followUpEndTime || extractedTimes.endTime;
  let isEndTimeAutoCompleted =
    !followUpEndTime && extractedTimes.autoCompletedEndTime;
  const finalEmail = followUps.guestEmail?.trim() || email;

  if (finalStartTime && !finalEndTime) {
    finalEndTime = addOneHour(finalStartTime);
    isEndTimeAutoCompleted = true;
  }

  if (followUpStartTime && !followUpEndTime) {
    finalEndTime = addOneHour(followUpStartTime);
    isEndTimeAutoCompleted = true;
  }

  const isDateMissing = !finalDate;
  const isStartTimeMissing = !finalStartTime;
  const isEmailMissing = !finalEmail;
  const missingMessages: string[] = [];
  const autoMessages: string[] = [];

  if (isDateMissing) {
    missingMessages.push("日付が入っていません。いつの予定ですか？");
  }

  if (isStartTimeMissing) {
    missingMessages.push("開始時間が入っていません。何時からですか？");
  }

  if (isEmailMissing) {
    missingMessages.push(
      "相手メールは不明です。必要に応じて後で追加してください。",
    );
  }

  if (isEndTimeAutoCompleted) {
    autoMessages.push("終了時間は開始時間の1時間後に自動設定しました。");
  }

  return {
    details: {
      title: guestName
        ? `${guestName}さんとの${mentionsZoom ? "Zoom" : "会議"}`
        : mentionsZoom
          ? "Zoomミーティング"
          : "",
      date: finalDate || "日付が入っていません（例：5月27日）",
      startTime: finalStartTime || "時間が入っていません",
      endTime: finalEndTime || "時間が入っていません",
      guestName,
      guestEmail: finalEmail || "相手メールは不明",
      memo,
    },
    missingMessages,
    autoMessages,
    needsConfirmation: isDateMissing || isStartTimeMissing,
    isDateMissing,
    isStartTimeMissing,
    isEmailMissing,
    isEndTimeAutoCompleted,
  };
}

export default function Home() {
  const [naturalInput, setNaturalInput] = useState(samplePrompt);
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [isZoomReady, setIsZoomReady] = useState(false);
  const [isZoomSubmitting, setIsZoomSubmitting] = useState(false);
  const [zoomErrorMessage, setZoomErrorMessage] = useState("");
  const [createdZoomMeeting, setCreatedZoomMeeting] =
    useState<CreatedZoomMeeting | null>(null);
  const [isInvitationEmailReady, setIsInvitationEmailReady] = useState(false);
  const [hasInputChangedAfterConfirmation, setHasInputChangedAfterConfirmation] =
    useState(false);
  const [followUpInputs, setFollowUpInputs] = useState<FollowUpInputs>({});
  const [appliedFollowUps, setAppliedFollowUps] = useState<FollowUpInputs>({});

  const extractionResult = useMemo(
    () => extractMeetingDetails(naturalInput, appliedFollowUps),
    [naturalInput, appliedFollowUps],
  );

  const hasInput = naturalInput.trim().length > 0;
  const canCreateZoom =
    hasConfirmed &&
    !extractionResult.isDateMissing &&
    !extractionResult.isStartTimeMissing;
  const canConfirmCalendarSync =
    !extractionResult.isDateMissing &&
    !extractionResult.isStartTimeMissing &&
    extractionResult.details.endTime !== "時間が入っていません";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasConfirmed(true);
    setIsZoomReady(false);
    setIsZoomSubmitting(false);
    setZoomErrorMessage("");
    setCreatedZoomMeeting(null);
    setIsInvitationEmailReady(false);
    setHasInputChangedAfterConfirmation(false);
  };

  const resetPreparationState = () => {
    setHasConfirmed(false);
    setIsZoomReady(false);
    setIsZoomSubmitting(false);
    setZoomErrorMessage("");
    setCreatedZoomMeeting(null);
    setIsInvitationEmailReady(false);
  };

  const handleNaturalInputChange = (value: string) => {
    const shouldShowChangedMessage =
      hasConfirmed || isZoomReady || isInvitationEmailReady;

    setNaturalInput(value);
    resetPreparationState();
    setHasInputChangedAfterConfirmation(
      (current) => current || shouldShowChangedMessage,
    );
    setFollowUpInputs({});
    setAppliedFollowUps({});
  };

  const handleStartNewSchedule = () => {
    setNaturalInput("");
    resetPreparationState();
    setHasInputChangedAfterConfirmation(false);
    setFollowUpInputs({});
    setAppliedFollowUps({});
  };

  const updateFollowUpInput = (key: keyof FollowUpInputs, value: string) => {
    setFollowUpInputs((current) => ({ ...current, [key]: value }));
  };

  const applyFollowUps = () => {
    setAppliedFollowUps((current) => {
      const next = { ...current };
      Object.entries(followUpInputs).forEach(([key, value]) => {
        const trimmedValue = value?.trim();
        if (trimmedValue) {
          next[key as keyof FollowUpInputs] = trimmedValue;
        }
      });
      return next;
    });
    setHasConfirmed(true);
    setIsZoomReady(false);
    setIsZoomSubmitting(false);
    setZoomErrorMessage("");
    setCreatedZoomMeeting(null);
    setIsInvitationEmailReady(false);
    setHasInputChangedAfterConfirmation(false);
  };

  const handleCreateZoomMeeting = async () => {
    if (!canCreateZoom) {
      return;
    }

    setIsZoomSubmitting(true);
    setZoomErrorMessage("");

    try {
      const response = await fetch("/api/zoom/create-meeting", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: extractionResult.details.title,
          date: extractionResult.details.date,
          startTime: extractionResult.details.startTime,
          endTime: extractionResult.details.endTime,
          guestName: extractionResult.details.guestName,
          guestEmail: extractionResult.details.guestEmail,
        }),
      });
      const data = (await response.json()) as ZoomCreateMeetingResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Zoomミーティング作成に失敗しました。");
      }

      setCreatedZoomMeeting(data.meeting ?? null);
      setIsZoomReady(true);
      handlePrepareInvitationEmail();
    } catch (error) {
      setIsZoomReady(false);
      setIsInvitationEmailReady(false);
      setCreatedZoomMeeting(null);
      setZoomErrorMessage(
        error instanceof Error
          ? error.message
          : "Zoomミーティング作成に失敗しました。",
      );
    } finally {
      setIsZoomSubmitting(false);
    }
  };

  const handlePrepareInvitationEmail = () => {
    setIsInvitationEmailReady(!extractionResult.isEmailMissing);
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
                  onChange={(event) =>
                    handleNaturalInputChange(event.target.value)
                  }
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

                <DetailsGrid details={extractionResult.details} />
                <NoticePanels
                  result={extractionResult}
                  values={followUpInputs}
                  onChange={updateFollowUpInput}
                  onApply={applyFollowUps}
                />
              </section>

              <section className="confirm-card">
                <div className="result-header">
                  <div className="section-heading compact-heading">
                    <h2>確認画面</h2>
                    <p>確認するボタンを押すと、ここに内容が反映されます。</p>
                  </div>
                  <span
                    className={`state-pill ${
                      hasConfirmed
                        ? extractionResult.needsConfirmation
                          ? "state-pill-warning"
                          : "state-pill-confirmed"
                        : "state-pill-empty"
                    }`}
                  >
                    {hasConfirmed
                      ? extractionResult.needsConfirmation
                        ? "要確認"
                        : "確認済み"
                      : "未確認"}
                  </span>
                </div>

                {hasConfirmed ? (
                  <>
                    <DetailsGrid details={extractionResult.details} compact />
                    <ZoomPreparationPanel
                      canCreateZoom={canCreateZoom}
                      isSubmitting={isZoomSubmitting}
                      errorMessage={zoomErrorMessage}
                      onCreateZoom={handleCreateZoomMeeting}
                    />
                  </>
                ) : (
                  <ConfirmationEmptyState
                    hasInputChangedAfterConfirmation={
                      hasInputChangedAfterConfirmation
                    }
                  />
                )}
              </section>
            </aside>
          </div>

          {isZoomReady ? (
            <ExecutionSummarySection
              result={extractionResult}
              meeting={createdZoomMeeting}
              canConfirmCalendarSync={canConfirmCalendarSync}
              isInvitationEmailReady={isInvitationEmailReady}
              onStartNewSchedule={handleStartNewSchedule}
            />
          ) : null}
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
  const memo = details.memo.trim();

  return (
    <>
      <dl className={`details-grid ${compact ? "details-grid-compact" : ""}`}>
        {detailLabels.map(([key, label]) => (
          <div key={key} className="detail-item">
            <dt>{label}</dt>
            <dd>{details[key] || "未抽出"}</dd>
          </div>
        ))}
      </dl>

      {memo ? (
        <dl className="detail-memo-card">
          <div>
            <dt>メモ</dt>
            <dd>{memo}</dd>
          </div>
        </dl>
      ) : null}
    </>
  );
}

function ZoomPreparationPanel({
  canCreateZoom,
  isSubmitting,
  errorMessage,
  onCreateZoom,
}: {
  canCreateZoom: boolean;
  isSubmitting: boolean;
  errorMessage: string;
  onCreateZoom: () => void;
}) {
  return (
    <section className="zoom-flow-card">
      <button
        type="button"
        className="zoom-create-button"
        disabled={!canCreateZoom || isSubmitting}
        onClick={onCreateZoom}
      >
        {isSubmitting ? "Zoomミーティング作成中..." : "この内容でZoomを作成する"}
      </button>

      {errorMessage ? (
        <p className="zoom-api-error-message">{errorMessage}</p>
      ) : null}
    </section>
  );
}

function ConfirmationEmptyState({
  hasInputChangedAfterConfirmation,
}: {
  hasInputChangedAfterConfirmation: boolean;
}) {
  return (
    <div
      className={`empty-state ${
        hasInputChangedAfterConfirmation ? "empty-state-changed" : ""
      }`}
    >
      <p>
        {hasInputChangedAfterConfirmation
          ? "入力内容が変更されました。もう一度確認してください。"
          : "まだ確認内容はありません"}
      </p>
      <span>
        {hasInputChangedAfterConfirmation
          ? "「確認する」を押すと、変更後の内容で確認画面を作り直します。"
          : "自然文を入力して「確認する」を押してください。"}
      </span>
    </div>
  );
}

function ExecutionSummarySection({
  result,
  meeting,
  canConfirmCalendarSync,
  isInvitationEmailReady,
  onStartNewSchedule,
}: {
  result: ExtractionResult;
  meeting: CreatedZoomMeeting | null;
  canConfirmCalendarSync: boolean;
  isInvitationEmailReady: boolean;
  onStartNewSchedule: () => void;
}) {
  const { details } = result;
  const dateTime = `${details.date} ${details.startTime}〜${details.endTime}`;

  return (
    <section className="execution-summary-section">
      <div className="execution-summary-header">
        <div>
          <p className="eyebrow eyebrow-green">実行前の確認</p>
          <h2>実行準備サマリー</h2>
        </div>
        <button
          type="button"
          className="new-schedule-button"
          onClick={onStartNewSchedule}
        >
          新しい予定を入力する
        </button>
      </div>

      <div className="execution-summary-grid">
        <article className="execution-summary-card execution-summary-card-zoom">
          <h3>Zoomミーティングを作成しました。</h3>
          <p>参加URLが発行されました。</p>
          <div className="execution-summary-lines">
            <p>
              <strong>会議</strong>
              <span>{details.title || "未抽出"}</span>
            </p>
            <p>
              <strong>日時</strong>
              <span>{dateTime}</span>
            </p>
            <p>
              <strong>相手</strong>
              <span>
                {details.guestName || "未抽出"} / {details.guestEmail}
              </span>
            </p>
            <p>
              <strong>URL</strong>
              {meeting?.joinUrl ? (
                <a
                  href={meeting.joinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="execution-summary-link"
                >
                  {meeting.joinUrl}
                </a>
              ) : (
                <span>参加URLを取得できませんでした</span>
              )}
            </p>
          </div>
        </article>

        <article className="execution-summary-card execution-summary-card-calendar">
          <h3>カレンダー連携確認</h3>
          <p>
            {canConfirmCalendarSync
              ? "Zoom作成後、ceo@hirotoebata.jp の連携カレンダーへ自動反映される想定です。"
              : "日付・開始時間・終了時間が不足しているため、カレンダー自動連携の確認ができません。"}
          </p>
          <div className="execution-summary-lines">
            <p>
              <strong>登録元</strong>
              <span>ceo@hirotoebata.jp</span>
            </p>
            <p>
              <strong>予定</strong>
              <span>{dateTime}</span>
            </p>
          </div>
        </article>

        <article className="execution-summary-card execution-summary-card-email">
          <div className="execution-summary-title-row">
            <h3>招待メール送信確認</h3>
            <span
              className={`execution-summary-state ${
                result.isEmailMissing
                  ? "execution-summary-state-warning"
                  : "execution-summary-state-ready"
              }`}
            >
              {result.isEmailMissing
                ? "要確認"
                : isInvitationEmailReady
                  ? "準備OK"
                  : "待機中"}
            </span>
          </div>
          <p>Zoom作成後、自分と相手へ招待メールを送る想定です。</p>
          {result.isEmailMissing ? (
            <p className="execution-summary-warning">
              相手メールが不明のため、招待メール送信にはメールアドレスの追加が必要です。
            </p>
          ) : (
            <p className="execution-summary-ready">
              招待メール送信準備ができています。次のステップでメール送信APIに接続します。
            </p>
          )}
          <div className="execution-summary-lines">
            <p>
              <strong>送信元</strong>
              <span>ceo@hirotoebata.jp</span>
            </p>
            <p>
              <strong>送信先</strong>
              <span>{details.guestEmail}</span>
            </p>
            <p>
              <strong>件名</strong>
              <span>{details.title || "未抽出"}</span>
            </p>
            <p>
              <strong>日時</strong>
              <span>{dateTime}</span>
            </p>
            {meeting?.joinUrl ? (
              <p>
                <strong>Zoom URL</strong>
                <span>{meeting.joinUrl}</span>
              </p>
            ) : null}
          </div>
        </article>
      </div>
    </section>
  );
}

function NoticePanels({
  result,
  values,
  onChange,
  onApply,
}: {
  result: ExtractionResult;
  values: FollowUpInputs;
  onChange: (key: keyof FollowUpInputs, value: string) => void;
  onApply: () => void;
}) {
  const shouldAskDate = result.isDateMissing;
  const shouldAskStartTime = result.isStartTimeMissing;
  const shouldAskEndTime =
    result.isEndTimeAutoCompleted && !result.isStartTimeMissing;
  const shouldAskEmail = result.isEmailMissing;
  const hasFollowUpFields =
    shouldAskDate || shouldAskStartTime || shouldAskEndTime || shouldAskEmail;

  if (
    result.missingMessages.length === 0 &&
    result.autoMessages.length === 0 &&
    !hasFollowUpFields
  ) {
    return null;
  }

  return (
    <div className="notice-stack">
      {result.missingMessages.length > 0 || hasFollowUpFields ? (
        <section className="notice-card notice-card-warning">
          <h3>追加で確認したいこと</h3>
          {result.missingMessages.length > 0 ? (
            <ul>
              {result.missingMessages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          ) : null}

          {hasFollowUpFields ? (
            <div className="follow-up-form">
              {shouldAskDate ? (
                <label>
                  <span>日付</span>
                  <input
                    value={values.date ?? ""}
                    onChange={(event) => onChange("date", event.target.value)}
                    placeholder="例：5月27日"
                  />
                </label>
              ) : null}

              {shouldAskStartTime ? (
                <label>
                  <span>開始時間</span>
                  <input
                    value={values.startTime ?? ""}
                    onChange={(event) =>
                      onChange("startTime", event.target.value)
                    }
                    placeholder="例：11:00"
                  />
                </label>
              ) : null}

              {shouldAskEndTime ? (
                <label>
                  <span>終了時間</span>
                  <input
                    value={values.endTime ?? result.details.endTime}
                    onChange={(event) =>
                      onChange("endTime", event.target.value)
                    }
                    placeholder="例：12:00"
                  />
                </label>
              ) : null}

              {shouldAskEmail ? (
                <label>
                  <span>相手メール</span>
                  <input
                    value={values.guestEmail ?? ""}
                    onChange={(event) =>
                      onChange("guestEmail", event.target.value)
                    }
                    placeholder="例：tanaka@example.com"
                  />
                </label>
              ) : null}

              <button type="button" onClick={onApply}>
                不足情報を反映する
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {result.autoMessages.length > 0 ? (
        <section className="notice-card notice-card-info">
          <h3>自動補完したこと</h3>
          <ul>
            {result.autoMessages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
