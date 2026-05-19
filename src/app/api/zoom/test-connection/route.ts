import { NextResponse } from "next/server";

type ZoomTokenResponse = {
  token_type?: string;
  expires_in?: number;
};

function hasRequiredZoomEnv(
  accountId: string | undefined,
  clientId: string | undefined,
  clientSecret: string | undefined,
  hostEmail: string | undefined,
) {
  return Boolean(accountId && clientId && clientSecret && hostEmail);
}

export async function GET() {
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  const hostEmail = process.env.ZOOM_HOST_EMAIL;

  if (!hasRequiredZoomEnv(accountId, clientId, clientSecret, hostEmail)) {
    return NextResponse.json(
      {
        ok: false,
        message: "Zoom環境変数が不足しています。",
      },
      { status: 500 },
    );
  }

  const zoomAccountId = accountId as string;
  const zoomClientId = clientId as string;
  const zoomClientSecret = clientSecret as string;
  const zoomHostEmail = hostEmail as string;

  const credentials = Buffer.from(
    `${zoomClientId}:${zoomClientSecret}`,
  ).toString(
    "base64",
  );
  const tokenUrl = new URL("https://zoom.us/oauth/token");
  tokenUrl.searchParams.set("grant_type", "account_credentials");
  tokenUrl.searchParams.set("account_id", zoomAccountId);

  try {
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: "Zoom認証に失敗しました。",
          status: response.status,
        },
        { status: response.status },
      );
    }

    const tokenData = (await response.json()) as ZoomTokenResponse;

    return NextResponse.json({
      ok: true,
      message: "Zoom認証に成功しました。",
      hostEmail: zoomHostEmail,
      tokenType: tokenData.token_type ?? "",
      expiresIn: tokenData.expires_in ?? 0,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "Zoom認証に失敗しました。",
        status: 500,
      },
      { status: 500 },
    );
  }
}
