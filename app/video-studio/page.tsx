"use client";

import { FormEvent, useEffect, useState } from "react";

type Mode = "text-to-video" | "image-to-video" | "continuation" | "avatar";
type Status = "idle" | "submitting" | "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED";

const modes: { value: Mode; label: string; description: string }[] = [
  { value: "text-to-video", label: "Text to video", description: "Create a scene from a written prompt." },
  { value: "image-to-video", label: "Image to video", description: "Animate a still image with a motion prompt." },
  { value: "continuation", label: "Video continuation", description: "Continue an existing clip with a new scene prompt." },
  { value: "avatar", label: "Talking avatar", description: "Animate a portrait using a driving audio track." },
];

export default function VideoStudioPage() {
  const [mode, setMode] = useState<Mode>("text-to-video");
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [resolution, setResolution] = useState("720p");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [numSegments, setNumSegments] = useState("1");
  const [status, setStatus] = useState<Status>("idle");
  const [requestId, setRequestId] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [error, setError] = useState("");
  const [details, setDetails] = useState("");

  useEffect(() => {
    if (!requestId || !["IN_QUEUE", "IN_PROGRESS"].includes(status)) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/video?requestId=${encodeURIComponent(requestId)}&mode=${mode}&resolution=${resolution}`, { cache: "no-store" });
        const data = await response.json();
        if (cancelled) return;
        if (!response.ok) {
          setError(data.error || "Unable to check generation status.");
          setStatus("FAILED");
          return;
        }
        if (data.status === "COMPLETED") {
          setStatus("COMPLETED");
          setResultUrl(data.videoUrl || "");
          if (!data.videoUrl) setDetails("The provider returned a completed result, but its video URL was not in the expected response field.");
        } else if (data.status === "FAILED") {
          setStatus("FAILED");
          setError("The video provider reported a failed generation.");
        } else {
          setStatus(data.status === "IN_PROGRESS" ? "IN_PROGRESS" : "IN_QUEUE");
        }
      } catch {
        if (!cancelled) {
          setError("Network error while checking generation status.");
          setStatus("FAILED");
        }
      }
    }, 2500);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [requestId, status, mode, resolution]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setDetails(""); setResultUrl(""); setRequestId(""); setStatus("submitting");
    try {
      const response = await fetch("/api/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, prompt, imageUrl, audioUrl, videoUrl, resolution, aspectRatio, numSegments }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not start video generation.");
      setRequestId(data.requestId);
      setStatus("IN_QUEUE");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start video generation.");
      setStatus("FAILED");
    }
  }

  const busy = status === "submitting" || status === "IN_QUEUE" || status === "IN_PROGRESS";

  return <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-8">
    <div className="mx-auto max-w-5xl">
      <a href="/" className="text-sm text-cyan-300 hover:text-cyan-200">← Back to LeadGen Pro</a>
      <header className="mb-8 mt-5">
        <div className="mb-3 inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold tracking-wide text-cyan-200">AUTOMASUITE · CREATIVE TOOLS</div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">LongCat Video Studio</h1>
        <p className="mt-3 max-w-2xl text-slate-300">Create marketing clips, animate images, continue scenes, or produce audio-driven talking-avatar videos using hosted LongCat workflows.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <form onSubmit={submit} className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
          <div>
            <label htmlFor="mode" className="mb-2 block text-sm font-medium">Generation workflow</label>
            <select id="mode" value={mode} onChange={(event) => setMode(event.target.value as Mode)} className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-3 text-sm">
              {modes.map((item) => <option key={item.value} value={item.value}>{item.label} — {item.description}</option>)}
            </select>
          </div>

          {mode !== "avatar" && <div>
            <label htmlFor="prompt" className="mb-2 block text-sm font-medium">Describe the video</label>
            <textarea id="prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} required maxLength={5000} rows={5} placeholder="Describe the subject, action, setting, camera movement, lighting and style…" className="w-full resize-y rounded-xl border border-white/15 bg-slate-900 px-3 py-3 text-sm outline-none focus:border-cyan-400" />
            <p className="mt-1 text-right text-xs text-slate-400">{prompt.length}/5000</p>
          </div>}

          {(mode === "image-to-video" || mode === "avatar") && <div>
            <label htmlFor="imageUrl" className="mb-2 block text-sm font-medium">Image URL (HTTPS preferred)</label>
            <input id="imageUrl" type="url" required value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://…/image.png" className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-3 text-sm" />
          </div>}
          {mode === "continuation" && <div>
            <label htmlFor="videoUrl" className="mb-2 block text-sm font-medium">Source video URL</label>
            <input id="videoUrl" type="url" required value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://…/clip.mp4" className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-3 text-sm" />
          </div>}
          {mode === "avatar" && <>
            <div>
              <label htmlFor="audioUrl" className="mb-2 block text-sm font-medium">Driving audio URL</label>
              <input id="audioUrl" type="url" required value={audioUrl} onChange={(event) => setAudioUrl(event.target.value)} placeholder="https://…/voice.mp3" className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-3 text-sm" />
            </div>
            <div>
              <label htmlFor="numSegments" className="mb-2 block text-sm font-medium">Avatar length</label>
              <select id="numSegments" value={numSegments} onChange={(event) => setNumSegments(event.target.value)} className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-3 text-sm">
                <option value="1">1 segment · about 6 seconds</option><option value="2">2 segments · about 11 seconds</option><option value="3">3 segments · about 16 seconds</option><option value="5">5 segments · about 26 seconds</option>
              </select>
            </div>
          </>}

          {mode !== "avatar" && <div>
            <label htmlFor="aspectRatio" className="mb-2 block text-sm font-medium">Aspect ratio</label>
            <select id="aspectRatio" value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value)} className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-3 text-sm"><option value="16:9">16:9 · landscape</option><option value="9:16">9:16 · vertical</option><option value="1:1">1:1 · square</option></select>
          </div>}
          <div>
            <label htmlFor="resolution" className="mb-2 block text-sm font-medium">Resolution</label>
            <select id="resolution" value={resolution} onChange={(event) => setResolution(event.target.value)} className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-3 text-sm"><option value="480p">480p · lower compute cost</option><option value="720p">720p · higher detail</option></select>
          </div>

          <button disabled={busy} className="w-full rounded-xl bg-cyan-300 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60">{busy ? "Generation in progress…" : "Generate video"}</button>
          <p className="text-xs leading-5 text-slate-400">Generation may incur provider charges. Confirm provider pricing before running production jobs. API credentials stay server-side; source assets must be accessible to the provider by URL.</p>
        </form>

        <section className="min-h-80 rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Generation status</h2>
          <p className="mt-2 text-sm text-slate-300">{status === "idle" ? "Your generated video will appear here." : status === "submitting" ? "Submitting your request…" : status === "IN_QUEUE" ? "Your request is queued with the hosted provider." : status === "IN_PROGRESS" ? "The model is generating your video. This can take several minutes." : status === "COMPLETED" ? "Generation completed." : "Generation needs attention."}</p>
          {requestId && <p className="mt-3 break-all text-xs text-slate-400">Request ID: {requestId}</p>}
          {error && <div role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</div>}
          {details && <p className="mt-4 text-sm text-amber-200">{details}</p>}
          {resultUrl && <div className="mt-5 space-y-3"><video controls playsInline className="w-full rounded-xl bg-black" src={resultUrl} /><a href={resultUrl} target="_blank" rel="noreferrer" className="inline-flex rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/15">Open or save video ↗</a></div>}
          {status === "COMPLETED" && !resultUrl && !error && <p className="mt-4 text-sm text-amber-200">The provider completed the job. Check the provider response or request logs for the returned asset.</p>}
        </section>
      </div>
      <footer className="mt-8 border-t border-white/10 pt-5 text-xs leading-5 text-slate-500">LongCat Video Studio is an AutomaSuite integration with hosted inference. It does not install model weights into the Next.js app. Provider access, supported endpoints, and usage charges depend on the configured inference account.</footer>
    </div>
  </main>;
}
