"use client";

import {
  AlertCircle,
  Ban,
  Check,
  CheckCheck,
  Copy,
  Download,
  FileText,
  Image as ImageIcon,
  LoaderCircle,
  MoreVertical,
  Pencil,
  Reply,
  RotateCcw,
  Save,
  Star,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";

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

  if (directSource) return { url: source || null, error: false, loading: false };
  if (resolved.source !== source) return { url: null, error: false, loading: true };
  return { url: resolved.url, error: resolved.error, loading: false };
}

function VoiceNote({ duration = null, outgoing, source }) {
  const [failedSource, setFailedSource] = useState(null);
  const { url, error, loading } = useResolvedMedia(source);
  const unavailable = error || failedSource === source;

  if (url && !unavailable) {
    return (
      <div className="w-56 max-w-full py-1 sm:w-[245px]">
        <audio
          controls
          preload="metadata"
          src={url}
          className="h-10 w-full opacity-90"
          onError={() => setFailedSource(source)}
        >
          <track kind="captions" />
        </audio>
        {duration ? <span className="mt-1 block text-[10px] text-white/45">{duration}</span> : null}
      </div>
    );
  }

  return (
    <div className="flex w-56 max-w-full items-center gap-3 py-1 sm:w-[245px]">
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
          outgoing ? "bg-white/10 text-white/55" : "bg-white/[0.06] text-white/45"
        }`}
        aria-hidden="true"
      >
        {loading ? <LoaderCircle size={18} className="animate-spin" /> : <Volume2 size={18} />}
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-white/70">
          {loading ? "Loading voice note…" : "Voice note unavailable"}
        </span>
        {duration ? <span className="mt-0.5 block text-[10px] text-white/45">{duration}</span> : null}
      </span>
    </div>
  );
}

function MediaCard({ caption, media }) {
  const source = media?.url || media?.mediaUrl || media;
  const [failedSource, setFailedSource] = useState(null);
  const { url, error, loading } = useResolvedMedia(source);
  const unavailable = error || failedSource === source;

  return (
    <div className="mb-1 w-[260px] max-w-full overflow-hidden rounded-xl bg-[#17333a]">
      <div className="relative grid h-40 place-items-center overflow-hidden bg-gradient-to-br from-[#6fb4a7] via-[#275d68] to-[#132b39]">
        {url && !unavailable ? (
          <Image
            src={url}
            alt={media?.alt || caption || "Shared image"}
            fill
            sizes="(max-width: 640px) 78vw, 260px"
            unoptimized
            className="object-cover"
            onError={() => setFailedSource(source)}
          />
        ) : (
          <span className="flex flex-col items-center gap-2 text-xs font-semibold text-white/55">
            {loading ? <LoaderCircle size={26} className="animate-spin" /> : <ImageIcon size={28} />}
            {loading ? "Loading photo…" : "Photo unavailable"}
          </span>
        )}
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
  const [failedSource, setFailedSource] = useState(null);
  const { url, error, loading } = useResolvedMedia(source);
  const unavailable = error || failedSource === source;

  return (
    <div className="mb-1 w-[300px] max-w-full overflow-hidden rounded-xl bg-black/30">
      {url && !unavailable ? (
        <video
          controls
          preload="metadata"
          src={url}
          className="max-h-64 w-full bg-black object-contain"
          onError={() => setFailedSource(source)}
        >
          <track kind="captions" />
        </video>
      ) : (
        <div className="grid h-36 place-items-center text-xs font-semibold text-white/50">
          <span className="flex flex-col items-center gap-2">
            {loading ? <LoaderCircle size={24} className="animate-spin" /> : <AlertCircle size={24} />}
            {loading ? "Loading video…" : "Video unavailable"}
          </span>
        </div>
      )}
      {caption ? <p className="px-2 pb-2 pt-2 text-sm leading-relaxed">{caption}</p> : null}
    </div>
  );
}

function FileCard({ file }) {
  const source = file?.url || file?.mediaUrl;
  const { url, error, loading } = useResolvedMedia(source);
  const name = file?.name || "Attachment";
  const extension = name.includes(".") ? name.split(".").pop().toUpperCase() : "File";
  const details = [file?.size, error || (!loading && !url) ? "File unavailable" : extension]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mb-1 flex w-[260px] max-w-full min-w-0 items-center gap-3 rounded-xl bg-black/15 p-3">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-rose-400/15 text-rose-300">
        <FileText size={22} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{name}</span>
        <span className="text-[11px] text-white/48">
          {loading ? "Preparing download…" : details}
        </span>
      </span>
      {url && !error ? (
        <a
          href={url}
          download={name}
          className="rounded-full p-2 text-white/55 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          aria-label={`Download ${name}`}
        >
          <Download size={18} />
        </a>
      ) : (
        <span
          className="rounded-full p-2 text-white/25"
          aria-label={loading ? `Preparing ${name}` : `${name} is unavailable`}
          aria-disabled="true"
        >
          {loading ? <LoaderCircle size={18} className="animate-spin" /> : <Download size={18} />}
        </span>
      )}
    </div>
  );
}

function ActionButton({ children, danger = false, disabled = false, icon: Icon, onClick, pressed }) {
  return (
    <button
      type="button"
      role={typeof pressed === "boolean" ? "menuitemcheckbox" : "menuitem"}
      disabled={disabled}
      aria-checked={typeof pressed === "boolean" ? pressed : undefined}
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:cursor-wait disabled:opacity-45 ${
        danger ? "text-rose-300 hover:bg-rose-400/10" : "text-white/75 hover:bg-white/[0.07] hover:text-white"
      }`}
    >
      <Icon size={15} aria-hidden="true" />
      <span>{children}</span>
    </button>
  );
}

async function copyMessageText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.select();
  const copied = document.execCommand("copy");
  textArea.remove();
  if (!copied) throw new Error("Message could not be copied.");
}

export default function MessageBubble({
  message,
  starred = false,
  onReply,
  onStar,
  onEdit,
  onDelete,
  onCopy,
  onRetry,
}) {
  const outgoing = message.direction === "outgoing" || message.sender === "me";
  const type = message.type || "text";
  const deleted = Boolean(message.deleted || message.isDeleted || type === "deleted");
  const persisted = message.id != null && !String(message.id).startsWith("temp-");
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.text || "");
  const [workingAction, setWorkingAction] = useState(null);
  const [actionError, setActionError] = useState("");
  const actionsRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = useId();

  const canCopy = !deleted && type === "text" && Boolean(message.text);
  const canEdit = persisted && !deleted && outgoing && type === "text" && typeof onEdit === "function";
  const canDelete = persisted && !deleted && typeof onDelete === "function";
  const canReply = persisted && !deleted && typeof onReply === "function";
  const canStar = persisted && !deleted && typeof onStar === "function";
  const canRetry = !deleted && message.status === "failed" && typeof onRetry === "function";
  const hasActions = canCopy || canEdit || canDelete || canReply || canStar || canRetry;

  useEffect(() => {
    if (!menuOpen) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!actionsRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      triggerRef.current?.focus();
    };
    const focusFrame = window.requestAnimationFrame(() => {
      menuRef.current?.querySelector('[role^="menuitem"]')?.focus();
    });

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  const runAction = async (name, action) => {
    setWorkingAction(name);
    setActionError("");
    try {
      await action();
      setMenuOpen(false);
    } catch (error) {
      setActionError(error?.message || "That action could not be completed.");
    } finally {
      setWorkingAction(null);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this message? This action cannot be undone.")) return;
    await runAction("delete", () => onDelete(message));
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    const nextText = editValue.trim();
    if (!nextText || nextText === message.text || typeof onEdit !== "function") return;

    setWorkingAction("edit");
    setActionError("");
    try {
      await onEdit(message, nextText);
      setEditing(false);
    } catch (error) {
      setActionError(error?.message || "The message could not be edited.");
    } finally {
      setWorkingAction(null);
    }
  };

  const handleMenuKeyDown = (event) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const items = [...(menuRef.current?.querySelectorAll('[role^="menuitem"]:not(:disabled)') || [])];
    if (!items.length) return;
    event.preventDefault();
    const index = items.indexOf(document.activeElement);
    if (event.key === "Home") items[0].focus();
    else if (event.key === "End") items.at(-1).focus();
    else if (event.key === "ArrowDown") items[(index + 1 + items.length) % items.length].focus();
    else items[(index - 1 + items.length) % items.length].focus();
  };

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
      <div className="relative min-w-0 max-w-[calc(100vw-3.75rem)] sm:max-w-[min(76%,560px)]">
        <div
          className={`${outgoing ? "message-out bg-[#075e50]" : "message-in bg-[#1d2b32]"} px-2.5 py-2 text-[13.5px] leading-[1.45] text-[#f1f6f7] shadow-sm shadow-black/15`}
        >
          {!deleted && message.replyTo ? (
            <div className={`mb-2 overflow-hidden rounded-lg border-l-[3px] border-emerald-400 ${outgoing ? "bg-black/15" : "bg-black/20"} px-2.5 py-2`}>
              <p className="text-[11px] font-bold text-emerald-300">{message.replyTo.sender || "You"}</p>
              <p className="truncate text-xs text-white/50">{message.replyTo.text}</p>
            </div>
          ) : null}

          {deleted ? (
            <p className="flex items-center gap-2 px-0.5 py-0.5 italic text-white/55">
              <Ban size={15} className="shrink-0" aria-hidden="true" />
              {message.deletedLabel || (outgoing ? "You deleted this message" : "This message was deleted")}
            </p>
          ) : null}
          {!deleted && type === "image" ? <MediaCard caption={message.caption} media={message.media} /> : null}
          {!deleted && type === "video" ? <VideoCard caption={message.caption} media={message.media} /> : null}
          {!deleted && (type === "voice" || type === "audio") ? <VoiceNote duration={message.duration} outgoing={outgoing} source={message.media?.url || message.media} /> : null}
          {!deleted && (type === "file" || type === "document") ? <FileCard file={message.file} /> : null}
          {!deleted && type === "text" && editing ? (
            <form onSubmit={handleEditSubmit} className="min-w-52 space-y-2 py-0.5">
              <label htmlFor={`${menuId}-edit`} className="sr-only">Edit message</label>
              <textarea
                id={`${menuId}-edit`}
                value={editValue}
                onChange={(event) => setEditValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setEditing(false);
                    setEditValue(message.text || "");
                  } else if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                autoFocus
                rows={2}
                maxLength={1000}
                disabled={workingAction === "edit"}
                className="block max-h-36 min-h-16 w-full resize-y rounded-lg border border-white/15 bg-black/20 px-2.5 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-emerald-300 disabled:opacity-60"
              />
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setEditValue(message.text || "");
                    setActionError("");
                  }}
                  disabled={workingAction === "edit"}
                  className="grid h-8 w-8 place-items-center rounded-full text-white/55 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:opacity-45"
                  aria-label="Cancel editing"
                >
                  <X size={16} />
                </button>
                <button
                  type="submit"
                  disabled={!editValue.trim() || editValue.trim() === message.text || workingAction === "edit"}
                  className="grid h-8 w-8 place-items-center rounded-full bg-emerald-300 text-[#0b332b] transition hover:bg-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-45"
                  aria-label={workingAction === "edit" ? "Saving message" : "Save edited message"}
                >
                  {workingAction === "edit" ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}
                </button>
              </div>
            </form>
          ) : null}
          {!deleted && type === "text" && !editing ? <p className="whitespace-pre-wrap break-words px-0.5">{message.text}</p> : null}

          <div className="mt-1 flex items-center justify-end gap-1">
            {starred && !deleted ? <Star size={10} fill="currentColor" className="text-amber-200/80" aria-label="Starred" /> : null}
            {message.edited && !deleted ? <span className="text-[9px] text-white/40">edited</span> : null}
            <span className="text-[9px] font-medium text-white/45">{message.time}</span>
            {outgoing ? <Receipt status={message.status} /> : null}
          </div>
          {message.status === "failed" && !deleted ? <p className="mt-1 text-right text-[10px] font-semibold text-rose-200">Not sent</p> : null}
          {actionError ? <p className="mt-1 text-right text-[10px] font-semibold text-rose-200" role="alert">{actionError}</p> : null}
        </div>
        {!deleted && message.reactions?.length ? (
          <div className={`absolute -bottom-4 ${outgoing ? "right-3" : "left-3"} flex rounded-full border border-[#0b161c] bg-[#263740] px-1.5 py-0.5 text-[11px] shadow-md`}>
            {message.reactions.map((reaction) => typeof reaction === "string" ? reaction : reaction.emoji).join(" ")}
          </div>
        ) : null}
        {hasActions && !editing ? (
          <div ref={actionsRef}>
            <button
              ref={triggerRef}
              type="button"
              onClick={() => {
                setActionError("");
                setMenuOpen((open) => !open);
              }}
              className={`absolute top-0 z-20 grid h-8 w-8 place-items-center rounded-full bg-[#17272e]/95 text-white/60 shadow-lg transition hover:text-white focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 ${
                outgoing ? "-left-9" : "-right-9"
              }`}
              aria-label="Message actions"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-controls={menuOpen ? menuId : undefined}
            >
              <MoreVertical size={17} />
            </button>
            {menuOpen ? (
              <div
                ref={menuRef}
                id={menuId}
                role="menu"
                aria-label="Message actions"
                onKeyDown={handleMenuKeyDown}
                className={`absolute top-9 z-30 w-44 rounded-xl border border-white/10 bg-[#17272e] p-1.5 shadow-2xl shadow-black/45 ${
                  outgoing ? "right-0" : "left-0"
                }`}
              >
                {canReply ? <ActionButton icon={Reply} disabled={Boolean(workingAction)} onClick={() => void runAction("reply", () => onReply(message))}>Reply</ActionButton> : null}
                {canCopy ? <ActionButton icon={Copy} disabled={Boolean(workingAction)} onClick={() => void runAction("copy", () => onCopy ? onCopy(message) : copyMessageText(message.text))}>Copy</ActionButton> : null}
                {canStar ? <ActionButton icon={Star} pressed={starred} disabled={Boolean(workingAction)} onClick={() => void runAction("star", () => onStar(message, !starred))}>{starred ? "Unstar" : "Star"}</ActionButton> : null}
                {canEdit ? <ActionButton icon={Pencil} disabled={Boolean(workingAction)} onClick={() => {
                  setEditValue(message.text || "");
                  setActionError("");
                  setEditing(true);
                  setMenuOpen(false);
                }}>Edit</ActionButton> : null}
                {canRetry ? <ActionButton icon={RotateCcw} disabled={Boolean(workingAction)} onClick={() => void runAction("retry", () => onRetry(message))}>Retry sending</ActionButton> : null}
                {canDelete ? <ActionButton icon={Trash2} danger disabled={Boolean(workingAction)} onClick={() => void handleDelete()}>Delete</ActionButton> : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
