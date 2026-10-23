import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODELS = {
  "text-to-video": {
    "480p": "fal-ai/longcat-video/text-to-video/480p",
    "720p": "fal-ai/longcat-video/text-to-video/720p",
  },
  "image-to-video": {
    "480p": "fal-ai/longcat-video/image-to-video/480p",
    "720p": "fal-ai/longcat-video/image-to-video/720p",
  },
  "avatar": {
    "480p": "fal-ai/longcat-single-avatar/image-audio-to-video",
    "720p": "fal-ai/longcat-single-avatar/image-audio-to-video",
  },
  "continuation": {
    "480p": "",
    "720p": "",
  },
} as const;

type Mode = keyof typeof MODELS;
type Resolution = "480p" | "720p";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function modelFor(mode: unknown, resolution: unknown): string | null {
  if (typeof mode !== "string" || !(mode in MODELS)) return null;
  const selectedResolution = resolution === "720p" ? "720p" : "480p";
  if (mode === "continuation") {
    const configured = process.env.LONGCAT_CONTINUATION_MODEL;
    return configured && /^fal-ai\/longcat-video\/[a-z0-9/-]+$/.test(configured) ? configured : null;
  }
  return MODELS[mode as Exclude<Mode, "continuation">][selectedResolution as Resolution];
}

function inputFor(mode: Mode, body: Record<string, unknown>) {
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (mode !== "avatar" && !prompt) throw new Error("Enter a prompt describing the video.");
  if (prompt.length > 5000) throw new Error("Prompt must be 5,000 characters or fewer.");

  const shared = {
    ...(prompt ? { prompt } : {}),
    enable_safety_checker: true,
    ...(body.aspectRatio === "9:16" || body.aspectRatio === "1:1" ? { aspect_ratio: body.aspectRatio } : { aspect_ratio: "16:9" }),
  };

  if (mode === "text-to-video") return shared;
  if (mode === "image-to-video") {
    if (!isHttpUrl(body.imageUrl)) throw new Error("Provide a valid HTTP(S) image URL.");
    return { ...shared, image_url: body.imageUrl };
  }
  if (mode === "continuation") {
    if (!isHttpUrl(body.videoUrl)) throw new Error("Provide a valid HTTP(S) video URL.");
    return { ...shared, video_url: body.videoUrl };
  }
  if (!isHttpUrl(body.imageUrl) || !isHttpUrl(body.audioUrl)) {
    throw new Error("Avatar generation requires valid HTTP(S) image and audio URLs.");
  }
  return {
    ...shared,
    image_url: body.imageUrl,
    audio_url: body.audioUrl,
    resolution: body.resolution === "720p" ? "720p" : "480p",
    num_segments: Math.min(5, Math.max(1, Number(body.numSegments) || 1)),
    enable_prompt_expansion: true,
  };
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.FAL_KEY;
  if (!apiKey) return jsonError("Video generation is not configured yet. Add FAL_KEY to the server environment after approval.", 503);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }

  const mode = body.mode as Mode;
  const resolution = body.resolution === "720p" ? "720p" : "480p";
  const model = modelFor(mode, resolution);
  if (!model && mode === "continuation") return jsonError("Video continuation is not enabled yet: the hosted provider endpoint must be confirmed and configured first.", 503);
  if (!model) return jsonError("Unsupported generation mode.", 400);

  let input: Record<string, unknown>;
  try {
    input = inputFor(mode, body);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Invalid input.", 400);
  }

  try {
    const response = await fetch(`https://queue.fal.run/${model}`, {
      method: "POST",
      headers: { Authorization: `Key ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json({ error: "The hosted video provider rejected the request.", detail: data?.detail ?? data?.error ?? null }, { status: response.status >= 400 && response.status < 600 ? response.status : 502 });
    }
    if (typeof data.request_id !== "string") return jsonError("Provider did not return a request ID.", 502);
    return NextResponse.json({ requestId: data.request_id, model, statusUrl: data.status_url ?? null, responseUrl: data.response_url ?? null });
  } catch {
    return jsonError("Could not reach the hosted video provider. Try again later.", 502);
  }
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.FAL_KEY;
  if (!apiKey) return jsonError("Video generation is not configured yet.", 503);

  const params = request.nextUrl.searchParams;
  const requestId = params.get("requestId");
  const mode = params.get("mode") as Mode | null;
  const resolution = params.get("resolution") === "720p" ? "720p" : "480p";
  const model = modelFor(mode, resolution);
  if (mode === "continuation" && !model) return jsonError("Video continuation is not enabled yet: the hosted provider endpoint must be confirmed and configured first.", 503);
  if (!requestId || !model || !/^[a-zA-Z0-9_-]{8,128}$/.test(requestId)) {
    return jsonError("A valid request ID and generation mode are required.", 400);
  }

  try {
    const statusResponse = await fetch(`https://queue.fal.run/${model}/requests/${encodeURIComponent(requestId)}/status`, {
      headers: { Authorization: `Key ${apiKey}` },
      cache: "no-store",
    });
    const statusData = await statusResponse.json().catch(() => ({}));
    if (!statusResponse.ok) return jsonError("Could not retrieve generation status.", statusResponse.status);

    const status = typeof statusData.status === "string" ? statusData.status : "IN_QUEUE";
    if (status !== "COMPLETED") return NextResponse.json({ status });

    const resultResponse = await fetch(`https://queue.fal.run/${model}/requests/${encodeURIComponent(requestId)}`, {
      headers: { Authorization: `Key ${apiKey}` },
      cache: "no-store",
    });
    const result = await resultResponse.json().catch(() => ({}));
    if (!resultResponse.ok) return jsonError("Generation completed, but the result could not be retrieved.", resultResponse.status);

    const videoUrl = result?.video?.url ?? result?.output?.video?.url ?? result?.videos?.[0]?.url ?? null;
    if (typeof videoUrl !== "string") return NextResponse.json({ status: "COMPLETED", result });
    return NextResponse.json({ status: "COMPLETED", videoUrl, result });
  } catch {
    return jsonError("Could not reach the hosted video provider.", 502);
  }
}
