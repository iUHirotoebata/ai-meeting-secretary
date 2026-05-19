import { NextResponse } from "next/server";

type ZoomCreateMeetingRequest = {
  topic?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  guestName?: string;
  guestEmail?: string;
};

function isPresent(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(request: Request) {
  let body: ZoomCreateMeetingRequest;

  try {
    body = (await request.json()) as ZoomCreateMeetingRequest;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "会議タイトル、日付、開始時間が必要です。",
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
        message: "会議タイトル、日付、開始時間が必要です。",
      },
      { status: 400 },
    );
  }

  // Future Zoom API integration will use these environment variables:
  // ZOOM_ACCOUNT_ID
  // ZOOM_CLIENT_ID
  // ZOOM_CLIENT_SECRET
  // ZOOM_HOST_EMAIL
  // Do not hard-code any secret values here.

  return NextResponse.json({
    ok: true,
    message:
      "Zoom API接続準備は完了しています。次のステップで実際のZoom作成を行います。",
    received,
  });
}
