import { NextResponse } from "next/server";
import { google } from "googleapis";

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
  password?: string;
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

function addMinutesToLocalDateTime(
  isoDate: string,
  time: string,
  minutesToAdd: number,
) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute));
  date.setUTCMinutes(date.getUTCMinutes() + minutesToAdd);

  return `${date.getUTCFullYear()}-${pad2(
    String(date.getUTCMonth() + 1),
  )}-${pad2(String(date.getUTCDate()))}T${pad2(
    String(date.getUTCHours()),
  )}:${pad2(String(date.getUTCMinutes()))}:00`;
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

function getGoogleEnv() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    refreshToken,
  };
}

type GoogleApiErrorLike = {
  message?: string;
  response?: {
    data?: unknown;
  };
};

function sanitizeErrorText(value: string) {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(
      /access_token["'\s:]+[A-Za-z0-9._~+/=-]+/gi,
      "access_token [redacted]",
    )
    .replace(
      /refresh_token["'\s:]+[A-Za-z0-9._~+/=-]+/gi,
      "refresh_token [redacted]",
    )
    .replace(
      /client_secret["'\s:]+[A-Za-z0-9._~+/=-]+/gi,
      "client_secret [redacted]",
    );
}

function getGoogleCalendarErrorMessage(error: unknown) {
  const googleError = error as GoogleApiErrorLike;
  const responseData = googleError.response?.data;
  const responseMessage =
    responseData && typeof responseData === "object"
      ? JSON.stringify(responseData)
      : typeof responseData === "string"
        ? responseData
        : "";
  const message = googleError.message ?? "";
  const details = [responseMessage, message].filter(Boolean).join(" / ");

  return sanitizeErrorText(details || "Google Calendar登録に失敗しました。");
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

async function insertGoogleCalendarEvent({
  topic,
  startTimeIso,
  endTimeIso,
  joinUrl,
  meetingId,
  passcode,
  guestEmail,
}: {
  topic: string;
  startTimeIso: string;
  endTimeIso: string;
  joinUrl: string;
  meetingId: string;
  passcode: string;
  guestEmail: string;
}) {
  const env = getGoogleEnv();

  if (!env) {
    return {
      calendarSynced: false,
      calendarError: "Google Calendar環境変数が不足しています。",
      calendarEventLink: "",
    };
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      env.clientId,
      env.clientSecret,
    );

    oauth2Client.setCredentials({
      refresh_token: env.refreshToken,
    });

    const calendar = google.calendar({
      version: "v3",
      auth: oauth2Client,
    });

    const event = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: topic,
        description: [
          `Zoom Join URL: ${joinUrl || "未取得"}`,
          `Meeting ID: ${meetingId || "未取得"}`,
          `Passcode: ${passcode || "未設定"}`,
        ].join("\n"),
        start: {
          dateTime: startTimeIso,
          timeZone: timezone,
        },
        end: {
          dateTime: endTimeIso,
          timeZone: timezone,
        },
        attendees: guestEmail ? [{ email: guestEmail }] : [],
      },
    });

    return {
      calendarSynced: true,
      calendarError: "",
      calendarEventLink: event.data.htmlLink ?? "",
    };
  } catch (error) {
    console.error("Google Calendar Error:", error);

    return {
      calendarSynced: false,
      calendarError: getGoogleCalendarErrorMessage(error),
      calendarEventLink: "",
    };
  }
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
    const meetingId = String(meeting.id ?? "");
    const joinUrl = meeting.join_url ?? "";
    const passcode = meeting.password ?? "";
    const calendarResult = await insertGoogleCalendarEvent({
      topic: received.topic,
      startTimeIso,
      endTimeIso: addMinutesToLocalDateTime(
        normalizedDate.isoDate,
        startTime,
        meeting.duration ?? duration,
      ),
      joinUrl,
      meetingId,
      passcode,
      guestEmail: received.guestEmail,
    });

    return NextResponse.json({
      ok: true,
      message: "Zoomミーティングを作成しました。",
      meeting: {
        id: meetingId,
        topic: meeting.topic ?? received.topic,
        startTime: startTimeIso,
        duration: meeting.duration ?? duration,
        timezone: meeting.timezone ?? timezone,
        joinUrl,
      },
      calendarSynced: calendarResult.calendarSynced,
      calendarEventLink: calendarResult.calendarEventLink,
      calendarError: calendarResult.calendarError,
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
