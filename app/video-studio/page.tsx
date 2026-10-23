"use client";

import { FormEvent, useEffect, useState } from "react";
import "./video-studio.css";

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
  const statusText = status === "idle" ? "Your generated video will appear here." : status === "submitting" ? "Submitting your request…" : status === "IN_QUEUE" ? "Your request is queued with the hosted provider." : status === "IN_PROGRESS" ? "The model is generating your video. This can take several minutes." : status === "COMPLETED" ? "Generation completed." : "Generation needs attention.";

  return <main className="video-studio">
    <div className="vs-container">
      <a href="/" className="vs-back">← Back to LeadGen Pro</a>
      <header className="vs-header">
        <div className="vs-eyebrow">AUTOMASUITE · CREATIVE TOOLS</div>
        <h1>LongCat Video Studio</h1>
        <p>Create marketing clips, animate images, continue scenes, or produce audio-driven talking-avatar videos using hosted LongCat workflows.</p>
      </header>
      <div className="vs-grid">
        <form onSubmit={submit} className="vs-panel vs-form">
          <div className="vs-field">
            <label htmlFor="mode">Generation workflow</label>
            <select id="mode" value={mode} onChange={(event) => setMode(event.target.value as Mode)}>
              {modes.map((item) => <option key={item.value} value={item.value}>{item.label} — {item.description}</option>)}
            </select>
          </div>
          {mode !== "avatar" && <div className="vs-field">
            <label htmlFor="prompt">Describe the video</label>
            <textarea id="prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} required maxLength={5000} rows={5} placeholder="Describe the subject, action, setting, camera movement, lighting and style…" />
            <small className="vs-count">{prompt.length}/5000</small>
          </div>}
          {(mode === "image-to-video" || mode === "avatar") && <div className="vs-field">
            <label htmlFor="imageUrl">Image URL (HTTPS preferred)</label>
            <input id="imageUrl" type="url" required value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://…/image.png" />
          </div>}
          {mode === "continuation" && <div className="vs-field">
            <label htmlFor="videoUrl">Source video URL</label>
            <input id="videoUrl" type="url" required value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://…/clip.mp4" />
          </div>}
          {mode === "avatar" && <>
            <div className="vs-field">
              <label htmlFor="audioUrl">Driving audio URL</label>
              <input id="audioUrl" type="url" required value={audioUrl} onChange={(event) => setAudioUrl(event.target.value)} placeholder="https://…/voice.mp3" />
            </div>
            <div className="vs-field">
              <label htmlFor="numSegments">Avatar length</label>
              <select id="numSegments" value={numSegments} onChange={(event) => setNumSegments(event.target.value)}>
                <option value="1">1 segment · about 6 seconds</option><option value="2">2 segments · about 11 seconds</option><option value="3">3 segments · about 16 seconds</option><option value="5">5 segments · about 26 seconds</option>
              </select>
            </div>
          </>}
          {mode !== "avatar" && <div className="vs-field">
            <label htmlFor="aspectRatio">Aspect ratio</label>
            <select id="aspectRatio" value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value)}><option value="16:9">16:9 · landscape</option><option value="9:16">9:16 · vertical</option><option value="1:1">1:1 · square</option></select>
          </div>}
          <div className="vs-field">
            <label htmlFor="resolution">Resolution</label>
            <select id="resolution" value={resolution} onChange={(event) => setResolution(event.target.value)}><option value="480p">480p · lower compute cost</option><option value="720p">720p · higher detail</option></select>
          </div>
          <button disabled={busy} className="vs-submit">{busy ? "Generation in progress…" : "Generate video"}</button>
          <p className="vs-note">Generation may incur provider charges. Confirm provider pricing before running production jobs. Input assets must be reachable by the provider through a URL.</p>
        </form>
        <section className="vs-panel vs-result" aria-live="polite">
          <h2>Generation status</h2>
          <p className="vs-status">{statusText}</p>
          {requestId && <p className="vs-request">Request ID: {requestId}</p>}
          {error && <div role="alert" className="vs-error">{error}</div>}
          {details && <p className="vs-details">{details}</p>}
          {resultUrl && <div className="vs-preview"><video controls playsInline src={resultUrl} /><a href={resultUrl} target="_blank" rel="noreferrer">Open or save video ↗</a></div>}
          {status === "COMPLETED" && !resultUrl && !error && <p className="vs-details">The provider completed the job. Check the provider response or request logs for the returned asset.</p>}
        </section>
      </div>
      <footer className="vs-footer">LongCat Video Studio is an AutomaSuite integration with hosted inference. It does not install model weights into the Next.js app. Provider access, supported endpoints, and usage charges depend on the configured inference account.</footer>
    </div>
  </main>;
}
