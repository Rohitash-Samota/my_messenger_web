"use client";

import {
  AlertCircle,
  Check,
  CheckCheck,
  Download,
  FileText,
  Image as ImageIcon,
  Pause,
  Play,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import { externalApiEnabled, getMediaObjectUrl } from "@/lib/api";

function Receipt({ status }) {
  if (status === "failed") {
    return <AlertCircle size={14} className="text-rose-300" aria-label="Failed to send" />;
  }
  if (status === "uploading" || status === "sending") {
    return <span className="h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white/80" aria-label="Sending" />;
  }
  if (status === "read") {
    return <CheckCheck size={14} className="text-[#55c9ff]" aria-label="Read" />;
  }
  if (status === "delivered") {
    return <CheckCheck size={14} className="text-white/45" aria-label="Delivered" />;
  }
  return <Check size={14} className="text-white/45" aria-label="Sent" />;
}

function useResolvedMedia(source) {
  const directSource =
    !externalApiEnabled || !source || /^(blob:|data:)/i.test(String(source));
  const [resolved, setResolved] = useState({ source: null, url: null, error: false });

  useEffect(() => {
    if (directSource) return undefined;

    let current = true;
    let resolvedUrl = null;
    const controller = new AbortController();
    void getMediaObjectUrl(source, { signal: controller.signal })
      .then((value) => {
        if (!current) {
          if (value?.startsWith("blob:") && value !== source) URL.revokeObjectURL(value);
          return;
        }
        resolvedUrl = value;
        setResolved({ source, url: value, error: false });
      })
      .catch((mediaError) => {
        if (mediaError?.name !== "AbortError" && current) {
          setResolved({ source, url: null, error: true });
        }
      });

    return () => {
      current = false;
      controller.abort();
      if (resolvedUrl?.startsWith("blob:") && resolvedUrl !== source) {
        URL.revokeObjectURL(resolvedUrl);
      }
    };
  }, [directSource, source]);

  if (directSource) return { url: source || null, error: false };
  if (resolved.source !== source) return { url: null, error: false };
  return { url: resolved.url, error: resolved.error };
}

function VoiceNote({ duration = "0:18", outgoing, source }) {
  const [playing, setPlaying] = useState(false);
  const { url, error } = useResolvedMedia(source);

  if (url && !error) {
    return (
      <div className="min-w-[245px] py-1">
        <audio
          controls
          preload="metadata"
          src={url}
          className="h-10 w-full max-w-[300px] opacity-90"
        >
          <track kind="captions" />
        </audio>
        {duration ? <span className="mt-1 block text-[10px] text-white/45">{duration}</span> : null}
      </div>
    );
  }

  return (
    <div className="flex min-w-[245px] items-center gap-3 py-1">
      <button
        type="button"
        onClick={() => setPlaying((value) => !value)}
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition hover:scale-105 ${
          outgoing ? "bg-white/15 text-white" : "bg-emerald-400 text-[#0d342b]"
        }`}
        aria-label={playing ? "Pause voice note" : "Play voice note"}
      >
        {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
      </button>
      <div className="flex-1">
        <div className="flex h-7 items-center gap-[3px]" aria-hidden="true">
          {[8, 15, 10, 20, 13, 24, 18, 9, 14, 22, 12, 17, 8, 19, 13, 23, 11, 16, 7, 12].map(
            (height, index) => (
              <span
                key={`${height}-${index}`}
                className={`w-[2px] rounded-full ${
                  index < (playing ? 9 : 3)
                    ? outgoing
                      ? "bg-white"
                      : "bg-emerald-400"
                    : "bg-white/25"
                }`}
                style={{ height }}
              />
            ),
          )}
        </div>
        <span className="text-[10px] text-white/50">{duration}</span>
      </div>
    </div>
  );
}

function MediaCard({ caption, media }) {
  const source = media?.url || media?.mediaUrl || media;
  const { url, error } = useResolvedMedia(source);
  return (
    <div className="mb-1 w-[260px] max-w-full overflow-hidden rounded-xl bg-[#17333a]">
      <div className="relative grid h-40 place-items-center overflow-hidden bg-gradient-to-br from-[#6fb4a7] via-[#275d68] to-[#132b39]">
        {url && !error ? <Image src={url} alt={media?.alt || caption || "Shared image"} fill sizes="260px" unoptimized className="object-cover" /> : <ImageIcon size={28} className="text-white/50" />}
        <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/35 px-2 py-1 text-[10px] text-white/80 backdrop-blur">
          <ImageIcon size={11} /> Photo
        </span>
      </div>
      {caption ? <p className="px-2 pb-1 pt-2 text-sm leading-relaxed">{caption}</p> : null}
    </div>
  );
}

function VideoCard({ media, caption }) {
  const source = media?.url || media?.mediaUrl || media;
  const { url, error } = useResolvedMedia(source);
  return (
    <div className="mb-1 w-[300px] max-w-full overflow-hidden rounded-xl bg-black/30">
      {url && !error ? <video controls preload="metadata" src={url} className="max-h-64 w-full bg-black object-contain"><track kind="captions" /></video> : <div className="grid h-36 place-items-center text-xs text-white/45">Video unavailable</div>}
      {caption ? <p className="px-2 pb-2 pt-2 text-sm leading-relaxed">{caption}</p> : null}
    </div>
  );
}

function FileCard({ file }) {
  const { url } = useResolvedMedia(file?.url || file?.mediaUrl);
  return (
    <div className="mb-1 flex min-w-[260px] items-center gap-3 rounded-xl bg-black/15 p-3">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-rose-400/15 text-rose-300">
        <FileText size={22} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{file?.name || "Project brief.pdf"}</span>
        <span className="text-[11px] text-white/48">{file?.size || "2.4 MB"} · PDF</span>
      </span>
      <a href={url || undefined} download={file?.name || true} className="rounded-full p-2 text-white/55 transition hover:bg-white/10 hover:text-white" aria-label="Download file">
        <Download size={18} />
      </a>
    </div>
  );
}

export default function MessageBubble({ message }) {
  const outgoing = message.direction === "outgoing" || message.sender === "me";
  const type = message.type || "text";

  if (type === "system") {
    return (
      <div className="my-1 flex justify-center">
        <p className="rounded-full bg-[#1b2a31]/90 px-3 py-1.5 text-[10px] font-semibold text-white/45 shadow-sm">
          {message.text}
        </p>
      </div>
    );
  }

  return (
    <div className={`group flex ${outgoing ? "justify-end" : "justify-start"}`}>
      <div className="relative max-w-[min(76%,560px)]">
        <div
          className={`${outgoing ? "message-out bg-[#075e50]" : "message-in bg-[#1d2b32]"} px-2.5 py-2 text-[13.5px] leading-[1.45] text-[#f1f6f7] shadow-sm shadow-black/15`}
        >
          {message.replyTo ? (
            <div className={`mb-2 overflow-hidden rounded-lg border-l-[3px] border-emerald-400 ${outgoing ? "bg-black/15" : "bg-black/20"} px-2.5 py-2`}>
              <p className="text-[11px] font-bold text-emerald-300">{message.replyTo.sender || "You"}</p>
              <p className="truncate text-xs text-white/50">{message.replyTo.text}</p>
            </div>
          ) : null}

          {type === "image" ? <MediaCard caption={message.caption} media={message.media} /> : null}
          {type === "video" ? <VideoCard caption={message.caption} media={message.media} /> : null}
          {(type === "voice" || type === "audio") ? <VoiceNote duration={message.duration} outgoing={outgoing} source={message.media?.url || message.media} /> : null}
          {(type === "file" || type === "document") ? <FileCard file={message.file} /> : null}
          {type === "text" ? <p className="whitespace-pre-wrap break-words px-0.5">{message.text}</p> : null}

          <div className={`mt-1 flex items-center justify-end gap-1 ${type === "voice" ? "-mt-4" : ""}`}>
            {message.edited ? <span className="text-[9px] text-white/40">edited</span> : null}
            <span className="text-[9px] font-medium text-white/45">{message.time}</span>
            {outgoing ? <Receipt status={message.status} /> : null}
          </div>
          {message.status === "failed" ? <p className="mt-1 text-right text-[10px] font-semibold text-rose-200">Not sent</p> : null}
        </div>
        {message.reactions?.length ? (
          <div className={`absolute -bottom-4 ${outgoing ? "right-3" : "left-3"} flex rounded-full border border-[#0b161c] bg-[#263740] px-1.5 py-0.5 text-[11px] shadow-md`}>
            {message.reactions.map((reaction) => typeof reaction === "string" ? reaction : reaction.emoji).join(" ")}
          </div>
        ) : null}
      </div>
    </div>
  );
}
