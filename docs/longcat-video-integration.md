# LongCat Video Studio — hosted inference

This integration adds an isolated Video Studio route and server-side queue API. It does not download model weights into the Next.js application, deploy the app, modify databases, or configure production secrets.

## Provider

The adapter targets fal.ai hosted endpoints for the Meituan LongCat video model family:

- Text-to-video: `fal-ai/longcat-video/text-to-video/480p` and `/720p`
- Image-to-video: `fal-ai/longcat-video/image-to-video/480p` and `/720p`
- Audio-driven single avatar: `fal-ai/longcat-single-avatar/image-audio-to-video`

The hosted continuation endpoint is not currently confirmed in the provider documentation inspected for this change. The UI includes the workflow, but the API returns HTTP 503 until a confirmed fal model slug is configured in the server-side `LONGCAT_CONTINUATION_MODEL` variable. The value must match `fal-ai/longcat-video/<endpoint-slug>`. The open-source repository supports video continuation, but a hosted endpoint is a separate provider product; do not represent continuation as operational until it is verified.

## Configuration

Set `FAL_KEY` only in the server-side environment of a non-production preview after explicit approval. Never use a `NEXT_PUBLIC_` prefix for this key. The API also requires `LONGCAT_VIDEO_ENABLED=true` as an explicit kill-switch; keep it unset or false until a controlled test is approved. No secrets or environment variables are created or changed by this code change.

## Request lifecycle

- `POST /api/video` validates the mode and required URLs, then submits a queued generation request.
- `GET /api/video?requestId=…&mode=…&resolution=…` checks queue status and retrieves the completed result.
- The browser polls status while the request is queued or running.
- Generation is not persisted to a database; request history remains in the provider and the current browser session.

## Safety and production readiness

- Safety checker remains enabled.
- Input URLs are validated as HTTP(S); assets must be reachable by the provider.
- The API key is only read on the server.
- Provider costs may apply per generation. Add user authentication, rate limiting, per-user quotas, and durable job history before exposing this feature publicly.
- Test endpoint names and queue response shapes against the provider before merging. Do not deploy or merge without explicit approval.
