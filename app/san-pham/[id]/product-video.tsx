"use client";
import { PlayCircle } from "lucide-react";

function youtubeId(url: string) {
  const m = url.match(/youtu\.be\/([\w-]{6,20})/) ?? url.match(/[?&]v=([\w-]{6,20})/) ?? url.match(/shorts\/([\w-]{6,20})/);
  return m?.[1] ?? null;
}

/** Short clip showing the squish / slow-rise: YouTube embed, uploaded video, or a TikTok link. */
export default function ProductVideo({ url, title }: { url: string; title: string }) {
  const yt = youtubeId(url);
  if (yt) return (
    <div className="product-video">
      <iframe src={`https://www.youtube-nocookie.com/embed/${yt}?rel=0&playsinline=1`} title={`Video ${title}`} loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
      <span>Video trải nghiệm độ mềm & độ nảy</span>
    </div>
  );
  if (/\.(mp4|webm|mov)$/i.test(url)) return (
    <div className="product-video">
      <video src={url} controls playsInline muted loop preload="metadata" aria-label={`Video ${title}`} />
      <span>Video trải nghiệm độ mềm & độ nảy</span>
    </div>
  );
  return (
    <a className="product-video-link" href={url} target="_blank" rel="noreferrer"><PlayCircle size={20} /> Xem video trải nghiệm trên TikTok</a>
  );
}
