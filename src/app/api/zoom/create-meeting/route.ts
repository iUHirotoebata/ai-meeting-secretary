import { NextResponse } from "next/server";

type ZoomCreateMeetingRequest = {
  topic?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  guestName?: string;
  guestEmail?: string;
};

type ZoomTokenResponse = {
  access_token?: string;
};

type ZoomMeetingResponse = {
  id?: number | string;
  topic?: string;
  start_time?: string;
  duration?: number;
  timezone?: string;
  join_url?: string;
};

type NormalizedDate = {
  isoDate: string;
};

const timezone = "Asia/Tokyo";
const requiredMessage = "会議タイトル、日付、開始時間が必要です。";
const dateWithYearMessage =
  "Zoom作成には年を含む日付が必要です。例：2026年5月27日";

function isPresent(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeInput(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[／]/g, "/")
    .replace(/[‐‑‒–—―－]/g, "-")
    .trim();
}

function pad2(value: string) {
  return value.padStart(2, "0");
}

function isValidDateParts(year: string, month: string, day: string) {
  const yearNumber = Number(year);
  const monthNumber = Number(month);
  const dayNumber = Number(day);
  const date = new Date(Date.UTC(yearNumber, monthNumber - 1, dayNumber));

  return (
    date.getUTCFullYear() === yearNumber &&
    date.getUTCMonth() === monthNumber - 1 &&
    date.getUTCDate() === dayNumber
  );
}

function normalizeDateWithYear(value: string): NormalizedDate | null {
  const normalized = normalizeInput(value);
  const textMatch = normalized.match(
    /^(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日$/,
  );
  const slashOrHyphenMatch = normalized.match(
    /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/,
  );
  const match = textMatch ?? slashOrHyphenMatch;

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;

  if (!isValidDateParts(year, month, day)) {
    return null;
  }

  const isoDate = `${year}-${pad2(month)}-${pad2(day)}`;

  return {
    isoDate,
  };
}

function normalizeTime(value: string) {
  const normalized = normalizeInput(value)
    .replace("時", ":")
    .replace("分", "");
  const match = normalized.match(/^(\d{1,2})(?::(\d{1,2}))?$/);

  if (!match) {
    return "";
  }

  const hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return "";
  }

  return `${pad2(String(hour))}:${pad2(String(minute))}`;
}

function toMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function getZoomEnv() {
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  const hostEmail = process.env.ZOOM_HOST_EMAIL;

  if (!accountId || !clientId || !clientSecret || !hostEmail) {
    return null;
  }

  return {
    accountId,
    clientId,
    clientSecret,
    hostEmail,
  };
}

async function getZoomAccessToken(
  env: NonNullable<ReturnType<typeof getZoomEnv>>,
) {
  const credentials = Buffer.from(
    `${env.clientId}:${env.clientSecret}`,
  ).toString("base64");
  const tokenUrl = new URL("https://zoom.us/oauth/token");
  tokenUrl.searchParams.set("grant_type", "account_credentials");
  tokenUrl.searchParams.set("account_id", env.accountId);

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      accessToken: null,
      status: response.status,
    };
  }

  const tokenData = (await response.json()) as ZoomTokenResponse;
  return {
    accessToken: tokenData.access_token ?? null,
    status: response.status,
  };
}

export async function POST(request: Request) {
  let body: ZoomCreateMeetingRequest;

  try {
    body = (await request.json()) as ZoomCreateMeetingRequest;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: requiredMessage,
      },
      { status: 400 },
    );
  }

  const received = {
    topic: body.topic?.trim() ?? "",
    date: body.date?.trim() ?? "",
    startTime: body.startTime?.trim() ?? "",
    endTime: body.endTime?.trim() ?? "",
    guestName: body.guestName?.trim() ?? "",
    guestEmail: body.guestEmail?.trim() ?? "",
  };

  if (
    !isPresent(received.topic) ||
    !isPresent(received.date) ||
    !isPresent(received.startTime)
  ) {
    return NextResponse.json(
      {
        ok: false,
        message: requiredMessage,
      },
      { status: 400 },
    );
  }

  const normalizedDate = normalizeDateWithYear(received.date);
  if (!normalizedDate) {
    return NextResponse.json(
      {
        ok: false,
        message: dateWithYearMessage,
      },
      { status: 400 },
    );
  }

  const startTime = normalizeTime(received.startTime);
  const hasEndTime = isPresent(received.endTime);
  const endTime = hasEndTime ? normalizeTime(received.endTime) : "";

  if (!startTime || (hasEndTime && !endTime)) {
    return NextResponse.json(
      {
        ok: false,
        message: requiredMessage,
      },
      { status: 400 },
    );
  }

  const startMinutes = toMinutes(startTime);
  const duration = endTime ? toMinutes(endTime) - startMinutes : 60;

  if (duration <= 0) {
    return NextResponse.json(
      {
        ok: false,
        message: "終了時間は開始時間より後にしてください。",
      },
      { status: 400 },
    );
  }

  const env = getZoomEnv();
  if (!env) {
    return NextResponse.json(
      {
        ok: false,
        message: "Zoom環境変数が不足しています。",
      },
      { status: 500 },
    );
  }

  try {
    const tokenResult = await getZoomAccessToken(env);

    if (!tokenResult.accessToken) {
      const errorStatus = tokenResult.status >= 400 ? tokenResult.status : 500;

      return NextResponse.json(
        {
          ok: false,
          message: "Zoomミーティング作成に失敗しました。",
          status: errorStatus,
        },
        { status: errorStatus },
      );
    }

    const startTimeIso = `${normalizedDate.isoDate}T${startTime}:00`;
    const response = await fetch(
      `https://api.zoom.us/v2/users/${encodeURIComponent(env.hostEmail)}/meetings`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenResult.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: received.topic,
          type: 2,
          start_time: startTimeIso,
          duration,
          timezone,
          agenda: received.topic,
          settings: {
            join_before_host: false,
            waiting_room: true,
            auto_recording: "none",
          },
        }),
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: "Zoomミーティング作成に失敗しました。",
          status: response.status,
        },
        { status: response.status },
      );
    }

    const meeting = (await response.json()) as ZoomMeetingResponse;

    return NextResponse.json({
      ok: true,
      message: "Zoomミーティングを作成しました。",
      meeting: {
        id: String(meeting.id ?? ""),
        topic: meeting.topic ?? received.topic,
        startTime: startTimeIso,
        duration: meeting.duration ?? duration,
        timezone: meeting.timezone ?? timezone,
        joinUrl: meeting.join_url ?? "",
      },
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "Zoomミーティング作成に失敗しました。",
        status: 500,
      },
      { status: 500 },
    );
  }
}
