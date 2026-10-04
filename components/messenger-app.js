"use client";

import {
  Archive,
  ArrowLeft,
  BellOff,
  Camera,
  CheckCheck,
  ChevronRight,
  CircleDashed,
  Image as ImageIcon,
  LockKeyhole,
  MessageCircle,
  Mic,
  MoreVertical,
  Paperclip,
  Phone,
  Pin,
  Search,
  Send,
  Settings,
  ShieldAlert,
  Smile,
  Square,
  Sparkles,
  SquarePen,
  Star,
  Timer,
  UsersRound,
  Video,
  WifiOff,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Avatar from "@/components/avatar";
import AuthScreen from "@/components/auth-screen";
import MessageBubble from "@/components/message-bubble";
import useCall from "@/hooks/use-call";
import useRealtimeChat from "@/hooks/use-realtime-chat";
import {
  createConversation,
  externalApiEnabled,
  getAccessToken,
  getAuthSession,
  getConversations,
  getCurrentUser,
  getMessages,
  markMessagesDelivered,
  markMessagesRead,
  searchUsers,
  sendMessage,
  subscribeAuthSession,
  uploadMedia,
} from "@/lib/api";

const navItems = [
  { id: "chats", label: "Chats", icon: MessageCircle },
  { id: "updates", label: "Updates", icon: CircleDashed },
  { id: "communities", label: "Communities", icon: UsersRound },
  { id: "calls", label: "Calls", icon: Phone },
];

const filters = ["All", "Unread", "Groups"];
const emojis = ["😀", "😂", "😍", "🥰", "😎", "🤝", "🙌", "🔥", "✨", "🎉", "❤️", "👍", "🙏", "👀", "💯"];

const fallbackConversation = {
  id: "maya",
  signalConversationId: 1,
  name: "Maya Chen",
  color: "emerald",
  online: true,
  status: "online",
  about: "Designing better days, one pixel at a time.",
  phone: "+91 98765 43210",
  lastMessage: "Perfect — see you then!",
  lastMessageAt: "10:42 AM",
  unread: 2,
};

const fallbackColors = ["emerald", "violet", "amber", "blue", "rose", "lime"];

const nameFromEmail = (email) => {
  const localPart = String(email || "").split("@")[0].replace(/[._-]+/g, " ").trim();
  if (!localPart) return "New contact";
  return localPart.replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const fileSizeLabel = (size) => {
  const bytes = Number(size);
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const mediaTypeFromFile = (file) => {
  const type = String(file?.type || "").toLowerCase();
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  return null;
};

function formatTimestamp(value, { list = false } = {}) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{1,2}:\d{2}(\s?[AP]M)?$/i.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay || !list) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  const dayDifference = Math.floor((now - date) / 86_400_000);
  if (dayDifference <= 6) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { day: "2-digit", month: "short" });
}

function normalizeConversation(item, index = 0) {
  const id = item.id ?? item.conversationId ?? item.conversionId;
  const type = String(item.type || item.conversationType || item.conversionType || "direct").toLowerCase();
  const peer = item.peer || item.recipient || item.participant || item.otherUser || item.peerUser || null;
  const peerEmail = item.peerEmail || item.recipientEmail || peer?.email;
  return {
    ...item,
    id,
    signalConversationId: Number.isInteger(Number(id)) && Number(id) > 0 ? Number(id) : index + 1,
    name:
      item.name ||
      item.title ||
      peer?.displayName ||
      peer?.name ||
      (peerEmail ? nameFromEmail(peerEmail) : null) ||
      (item.clientId ? `Contact ${item.clientId}` : `Conversation ${id}`),
    email: peerEmail || item.email || null,
    phone: item.phone || item.mobileNumber || peer?.mobileNumber || null,
    profilePhoto: item.profilePhoto || item.avatarUrl || peer?.profilePhoto || null,
    color: item.color || item.avatar?.color || fallbackColors[index % fallbackColors.length],
    type: type === "individual" ? "direct" : type,
    lastMessage: item.lastMessage?.text || item.lastMessage || (item.lastMessageId ? "Open to view recent messages" : "Start a conversation"),
    lastMessageAt: formatTimestamp(item.lastMessageAt || item.lastActivityAt || item.time, { list: true }),
    unread: Number(item.unread ?? item.unreadCount ?? 0),
  };
}

function normalizeMessage(item, currentUserId = null) {
  const rawDuration = item.duration;
  const duration = typeof rawDuration === "number"
    ? `${Math.floor(rawDuration / 60)}:${String(Math.floor(rawDuration % 60)).padStart(2, "0")}`
    : rawDuration;
  const type = String(item.type || item.messageType || "text").toLowerCase();
  const content = item.text ?? item.content ?? "";
  const isMedia = ["image", "video", "audio", "voice", "document", "file"].includes(type);
  const mediaUrl = item.media?.url || item.mediaUrl || item.url || (isMedia ? content : null);
  const senderUserId = item.senderUserId ?? item.sender?.id ?? null;
  const direction =
    item.direction ||
    (currentUserId != null && String(senderUserId) === String(currentUserId)
      ? "outgoing"
      : "incoming");
  return {
    ...item,
    id: item.id ?? item.messageId ?? item.clientMessageId,
    conversationId: item.conversationId ?? item.conversionId,
    senderUserId,
    direction,
    text: type === "text" ? content : item.caption || "",
    caption: item.caption || (isMedia && item.media ? content : ""),
    type,
    status: String(item.status || "sent").toLowerCase(),
    time: formatTimestamp(item.time || item.createdAt),
    duration,
    media: mediaUrl ? { ...(typeof item.media === "object" ? item.media : {}), url: mediaUrl } : null,
    file:
      type === "document" || type === "file"
        ? {
            ...(item.file || {}),
            name:
              item.file?.name ||
              item.fileName ||
              item.originalFilename ||
              item.originalName ||
              "Attachment",
            size: item.file?.sizeLabel || fileSizeLabel(item.file?.size || item.size),
            url: item.file?.url || mediaUrl,
          }
        : null,
    reactions: (item.reactions || []).map((reaction) => typeof reaction === "string" ? reaction : reaction.emoji),
  };
}

function unwrapList(result, key) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.[key])) return result[key];
  if (Array.isArray(result?.items)) return result.items;
  return [];
}

function messageKey(message) {
  return String(message?.id ?? message?.messageId ?? message?.clientMessageId ?? "");
}

function upsertMessage(items, message, replaceId = null) {
  const nextKey = messageKey(message);
  const clientId = message?.clientMessageId;
  const filtered = items.filter((item) => {
    if (replaceId != null && String(item.id) === String(replaceId)) return false;
    if (nextKey && messageKey(item) === nextKey) return false;
    if (clientId && item.clientMessageId === clientId) return false;
    return true;
  });
  return [...filtered, message].sort((left, right) => {
    const leftDate = new Date(left.createdAt || 0).getTime();
    const rightDate = new Date(right.createdAt || 0).getTime();
    if (leftDate && rightDate && leftDate !== rightDate) return leftDate - rightDate;
    const leftId = Number(left.id);
    const rightId = Number(right.id);
    return Number.isFinite(leftId) && Number.isFinite(rightId) ? leftId - rightId : 0;
  });
}

function IconButton({ label, children, active = false, className = "", ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl outline-none transition focus-visible:ring-2 focus-visible:ring-emerald-400/70 ${
        active ? "bg-emerald-400/15 text-emerald-300" : "text-[#96a8b0] hover:bg-white/[0.07] hover:text-white"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function Logo() {
  return (
    <div className="grid h-10 w-10 place-items-center rounded-[14px] bg-gradient-to-br from-emerald-300 via-emerald-400 to-teal-600 text-[#06271e] shadow-lg shadow-emerald-950/40">
      <MessageCircle size={22} strokeWidth={2.7} fill="currentColor" className="text-[#0a3d30]" />
    </div>
  );
}

function NavRail({ current, onChange }) {
  return (
    <nav className="hidden w-[72px] shrink-0 flex-col items-center border-r border-white/[0.06] bg-[#091319] py-4 md:flex" aria-label="Primary navigation">
      <Logo />
      <div className="mt-7 flex flex-1 flex-col gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <IconButton key={item.id} label={item.label} active={current === item.id} onClick={() => onChange(item.id)}>
              <Icon size={20} />
            </IconButton>
          );
        })}
      </div>
      <div className="flex flex-col items-center gap-2">
        <IconButton label="Settings">
          <Settings size={20} />
        </IconButton>
        <Avatar name="Rohit Samota" color="amber" size="sm" online />
      </div>
    </nav>
  );
}

function MobileNav({ current, onChange }) {
  return (
    <nav className="grid h-[66px] shrink-0 grid-cols-4 border-t border-white/[0.07] bg-[#101b21] px-3 pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Primary navigation">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = current === item.id;
        return (
          <button key={item.id} type="button" onClick={() => onChange(item.id)} className={`flex flex-col items-center justify-center gap-1 text-[10px] font-semibold ${active ? "text-emerald-300" : "text-[#81939c]"}`}>
            <Icon size={20} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

function ConversationSkeleton() {
  return (
    <div className="space-y-1 px-3 py-2">
      {[0, 1, 2, 3, 4, 5].map((item) => (
        <div key={item} className="flex animate-pulse items-center gap-3 rounded-2xl px-2 py-3">
          <div className="h-12 w-12 rounded-full bg-white/[0.06]" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/5 rounded-full bg-white/[0.07]" />
            <div className="h-2.5 w-4/5 rounded-full bg-white/[0.05]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ConversationRow({ conversation, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "page" : undefined}
      className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400/60 ${
        selected ? "bg-[#1d3037]" : "hover:bg-white/[0.045]"
      }`}
    >
      <Avatar name={conversation.name} color={conversation.color} size="md" online={conversation.online} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[13.5px] font-bold text-[#ecf2f3]">{conversation.name}</span>
          {conversation.pinned ? <Pin size={11} className="ml-auto shrink-0 rotate-45 text-[#84979f]" /> : null}
          <span className={`shrink-0 text-[10px] font-medium ${conversation.unread ? "text-emerald-300" : "text-[#71858e]"}`}>
            {conversation.lastMessageAt || conversation.time}
          </span>
        </span>
        <span className="mt-1 flex items-center gap-1.5">
          {conversation.mine ? <CheckCheck size={13} className="shrink-0 text-sky-400" /> : null}
          <span className={`min-w-0 flex-1 truncate text-xs ${conversation.draft ? "text-emerald-300" : "text-[#84969e]"}`}>
            {conversation.draft ? <strong>Draft: </strong> : null}
            {conversation.lastMessage}
          </span>
          {conversation.muted ? <BellOff size={12} className="shrink-0 text-[#71858e]" /> : null}
          {conversation.unread ? (
            <span className="grid min-w-5 shrink-0 place-items-center rounded-full bg-emerald-400 px-1.5 py-0.5 text-[9px] font-extrabold text-[#05251d]">
              {conversation.unread > 99 ? "99+" : conversation.unread}
            </span>
          ) : null}
        </span>
      </span>
    </button>
  );
}

function Sidebar({
  conversations,
  selectedId,
  onSelect,
  loading,
  error,
  onRetry,
  onNewChat,
  mobileThread,
  connectionStatus,
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return conversations.filter((conversation) => {
      const searchMatch = !query || `${conversation.name} ${conversation.lastMessage}`.toLowerCase().includes(query);
      const filterMatch =
        filter === "All" ||
        (filter === "Unread" && conversation.unread > 0) ||
        (filter === "Groups" && (conversation.type === "group" || conversation.isGroup));
      return searchMatch && filterMatch;
    });
  }, [conversations, filter, search]);

  return (
    <aside className={`${mobileThread ? "hidden md:flex" : "flex"} min-w-0 flex-1 flex-col border-r border-white/[0.07] bg-[#101b21] md:w-[370px] md:flex-none lg:w-[390px]`} aria-label="Conversation inbox">
      <header className="flex h-[72px] shrink-0 items-center justify-between px-5 pt-[env(safe-area-inset-top)]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="md:hidden"><Logo /></span>
            <div>
              <h1 className="text-[21px] font-extrabold tracking-[-0.04em] text-white">Messages</h1>
              <p className={`mt-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${connectionStatus === "connected" ? "text-emerald-300/80" : connectionStatus === "error" ? "text-rose-300/80" : "text-white/35"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${connectionStatus === "connected" ? "bg-emerald-300" : connectionStatus === "error" ? "bg-rose-300" : "bg-amber-300/70"}`} />
                {connectionStatus === "connected" ? "Live inbox" : connectionStatus === "demo" ? "Demo inbox" : connectionStatus === "error" ? "REST fallback" : "Connecting"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <IconButton label="New conversation" onClick={onNewChat}><SquarePen size={19} /></IconButton>
          <IconButton label="Inbox menu"><MoreVertical size={19} /></IconButton>
        </div>
      </header>

      <div className="px-4 pb-3 pt-1">
        <label className="flex h-10 items-center gap-2.5 rounded-xl border border-white/[0.05] bg-[#19272e] px-3 text-[#82949d] transition focus-within:border-emerald-400/30 focus-within:bg-[#1c2c33]">
          <Search size={16} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-[#71848c]" placeholder="Search or start a new chat" aria-label="Search conversations" />
          {search ? <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="rounded-full p-1 hover:bg-white/10"><X size={13} /></button> : null}
        </label>
        <div className="mt-3 flex items-center gap-2">
          {filters.map((item) => (
            <button key={item} type="button" onClick={() => setFilter(item)} className={`rounded-full border px-3 py-1.5 text-[10px] font-bold transition ${filter === item ? "border-emerald-400/25 bg-emerald-400/15 text-emerald-300" : "border-white/[0.07] text-[#84969e] hover:border-white/15 hover:text-white"}`}>
              {item}
            </button>
          ))}
        </div>
      </div>

      <button type="button" className="mx-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-[#95a7ae] transition hover:bg-white/[0.04] hover:text-white">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#19272e] text-emerald-300"><Archive size={17} /></span>
        Archived
        <span className="ml-auto text-[10px] text-emerald-300">4</span>
      </button>

      <div className="soft-scrollbar min-h-0 flex-1 overflow-y-auto px-2 pb-3 pt-1">
        {loading ? <ConversationSkeleton /> : null}
        {error ? (
          <div className="mx-3 mt-8 rounded-2xl border border-rose-400/15 bg-rose-400/[0.06] p-5 text-center">
            <WifiOff size={24} className="mx-auto text-rose-300" />
            <p className="mt-3 text-sm font-bold">Couldn’t load chats</p>
            <p className="mt-1 text-[11px] leading-relaxed text-white/45">Check your connection and try once more.</p>
            <button type="button" onClick={onRetry} className="mt-4 rounded-full bg-white/10 px-4 py-2 text-[11px] font-bold hover:bg-white/15">Try again</button>
          </div>
        ) : null}
        {!loading && !error && filtered.length === 0 ? (
          <div className="px-8 py-14 text-center text-[#768a93]">
            <MessageCircle size={28} className="mx-auto opacity-60" />
            <p className="mt-3 text-sm font-bold text-white/75">No chats found</p>
            <p className="mt-1 text-xs">Try another name or filter.</p>
          </div>
        ) : null}
        {filtered.map((conversation) => (
          <ConversationRow key={conversation.id} conversation={conversation} selected={String(conversation.id) === String(selectedId)} onSelect={() => onSelect(conversation)} />
        ))}
      </div>
      <MobileNav current="chats" onChange={() => {}} />
    </aside>
  );
}

function EmptyChat() {
  return (
    <section className="hidden min-w-0 flex-1 flex-col items-center justify-center bg-[#0c171d] px-8 text-center md:flex">
      <div className="relative grid h-28 w-28 place-items-center rounded-[34px] border border-white/[0.06] bg-gradient-to-br from-[#172a31] to-[#0f1c22] shadow-2xl shadow-black/30">
        <MessageCircle size={48} className="text-emerald-300" />
        <Sparkles size={20} className="absolute right-4 top-4 text-amber-300" />
      </div>
      <h2 className="mt-7 text-2xl font-extrabold tracking-tight">Your conversations, together</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#80939c]">Choose a chat from the inbox to start messaging securely from any device.</p>
      <p className="mt-10 flex items-center gap-2 text-[10px] text-[#687d86]"><LockKeyhole size={13} /> Private messages are end-to-end encrypted</p>
    </section>
  );
}

function MessageSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-10">
      {["w-2/5", "w-3/5 ml-auto", "w-1/3", "w-1/2 ml-auto", "w-2/5"].map((width, index) => (
        <div key={`${width}-${index}`} className={`h-14 ${width} animate-pulse rounded-2xl bg-white/[0.055]`} />
      ))}
    </div>
  );
}

function AttachmentMenu({ onChoose, onClose }) {
  const actions = [
    { id: "media", label: "Photos & videos", icon: ImageIcon, tone: "bg-sky-400/15 text-sky-300" },
    { id: "camera", label: "Camera", icon: Camera, tone: "bg-rose-400/15 text-rose-300" },
  ];
  return (
    <div className="glass-popover absolute bottom-14 left-0 z-30 w-56 rounded-2xl p-2" role="dialog" aria-label="Add attachment">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button key={action.label} type="button" onClick={() => { onChoose(action.id); onClose(); }} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-xs font-semibold text-white/75 transition hover:bg-white/[0.06] hover:text-white">
            <span className={`grid h-9 w-9 place-items-center rounded-xl ${action.tone}`}><Icon size={17} /></span>
            {action.label}
          </button>
        );
      })}
    </div>
  );
}

function EmojiPicker({ onPick }) {
  return (
    <div className="glass-popover absolute bottom-14 left-0 z-30 w-64 rounded-2xl p-3" role="dialog" aria-label="Emoji picker">
      <p className="mb-3 px-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">Frequently used</p>
      <div className="grid grid-cols-5 gap-1">
        {emojis.map((emoji) => <button key={emoji} type="button" onClick={() => onPick(emoji)} className="grid h-10 place-items-center rounded-xl text-xl transition hover:bg-white/10 hover:scale-110">{emoji}</button>)}
      </div>
    </div>
  );
}

function Composer({ onSend, onUpload, sending, uploading, sendError }) {
  const [text, setText] = useState("");
  const [menu, setMenu] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [localError, setLocalError] = useState("");
  const textareaRef = useRef(null);
  const mediaInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const recorderRef = useRef(null);
  const recordingStreamRef = useRef(null);
  const chunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const recordingStartedAtRef = useRef(0);

  const clearRecording = useCallback(() => {
    if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = null;
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
    recorderRef.current = null;
    recordingStartedAtRef.current = 0;
    setRecording(false);
    setRecordingSeconds(0);
  }, []);

  useEffect(() => () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.stop();
    }
    if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current);
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const submit = async () => {
    const value = text.trim();
    if (!value || sending) return;
    setText("");
    setMenu(null);
    setLocalError("");
    try {
      await onSend({ text: value, type: "text" });
    } catch (messageError) {
      setText(value);
      setLocalError(messageError.message || "Message not sent.");
    }
    textareaRef.current?.focus();
  };

  const chooseAttachment = (kind) => {
    if (kind === "media") mediaInputRef.current?.click();
    else cameraInputRef.current?.click();
  };

  const uploadSelection = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const type = mediaTypeFromFile(file);
    if (!type) {
      setLocalError("Choose an image, video, or audio file.");
      return;
    }
    setLocalError("");
    try {
      await onUpload(file, { type });
    } catch (uploadError) {
      setLocalError(uploadError.message || "Attachment not sent.");
    }
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setLocalError("Voice recording is not supported in this browser.");
      return;
    }
    setLocalError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredType = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"]
        .find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, preferredType ? { mimeType: preferredType } : undefined);
      chunksRef.current = [];
      recordingStreamRef.current = stream;
      recorderRef.current = recorder;
      recordingStartedAtRef.current = Date.now();
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const duration = Math.max(
          1,
          Math.round((Date.now() - recordingStartedAtRef.current) / 1000),
        );
        const mimeType = recorder.mimeType || "audio/webm";
        const extension = mimeType.includes("ogg") ? "ogg" : "webm";
        const voice = new File(chunksRef.current, `voice-${Date.now()}.${extension}`, { type: mimeType });
        clearRecording();
        if (voice.size) {
          void onUpload(voice, { type: "audio", duration }).catch((uploadError) => {
            setLocalError(uploadError.message || "Voice note not sent.");
          });
        }
      };
      recorder.start(250);
      setRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((value) => value + 1);
      }, 1000);
    } catch (recordingError) {
      clearRecording();
      setLocalError(recordingError.message || "Microphone permission is required.");
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop();
  };

  const onKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
    if (event.key === "Escape") setMenu(null);
  };

  return (
    <footer className="relative z-20 shrink-0 border-t border-white/[0.06] bg-[#111d23]/95 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl md:px-4">
      <div className="mx-auto flex max-w-4xl items-end gap-1.5">
        <div className="relative">
          <IconButton label="Choose emoji" active={menu === "emoji"} onClick={() => setMenu((value) => value === "emoji" ? null : "emoji")} aria-expanded={menu === "emoji"}><Smile size={20} /></IconButton>
          {menu === "emoji" ? <EmojiPicker onPick={(emoji) => { setText((value) => `${value}${emoji}`); textareaRef.current?.focus(); }} /> : null}
        </div>
        <div className="relative">
          <IconButton label="Attach a file" active={menu === "attach"} onClick={() => setMenu((value) => value === "attach" ? null : "attach")} aria-expanded={menu === "attach"}><Paperclip size={20} /></IconButton>
          {menu === "attach" ? <AttachmentMenu onChoose={chooseAttachment} onClose={() => setMenu(null)} /> : null}
          <input ref={mediaInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={uploadSelection} />
          <input ref={cameraInputRef} type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={uploadSelection} />
        </div>
        <label className={`flex min-h-11 min-w-0 flex-1 items-end rounded-2xl border px-4 py-2.5 ${recording ? "border-rose-400/25 bg-rose-400/[0.07]" : "border-white/[0.06] bg-[#1b2a31] focus-within:border-emerald-400/25"}`}>
          {recording ? <span className="flex min-h-[22px] items-center gap-2 text-xs font-bold text-rose-200"><span className="h-2 w-2 animate-pulse rounded-full bg-rose-400" /> Recording {Math.floor(recordingSeconds / 60)}:{String(recordingSeconds % 60).padStart(2, "0")}</span> : <textarea ref={textareaRef} rows={1} value={text} onChange={(event) => setText(event.target.value)} onKeyDown={onKeyDown} placeholder={uploading ? "Uploading attachment…" : "Type a message"} aria-label="Message" disabled={uploading} className="soft-scrollbar max-h-28 min-h-[22px] w-full resize-none bg-transparent text-[13px] leading-[22px] text-white outline-none placeholder:text-[#71858e] disabled:opacity-60" />}
        </label>
        <button disabled={(sending || uploading) && !recording} type="button" onClick={text.trim() ? submit : recording ? stopRecording : startRecording} className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:cursor-wait disabled:opacity-50 ${text.trim() ? "bg-emerald-400 text-[#06271e] shadow-lg shadow-emerald-950/40 hover:bg-emerald-300" : recording ? "bg-rose-500 text-white" : "bg-[#1b2a31] text-[#91a4ac] hover:bg-[#21343c]"}`} aria-label={text.trim() ? "Send message" : recording ? "Stop voice recording" : "Record voice message"}>
          {text.trim() ? <Send size={18} fill="currentColor" /> : recording ? <Square size={16} fill="currentColor" /> : <Mic size={20} />}
        </button>
      </div>
      {uploading ? <p className="mx-auto mt-2 max-w-4xl text-[10px] font-semibold text-emerald-300">Uploading securely…</p> : null}
      {localError || sendError ? <p className="mx-auto mt-2 max-w-4xl text-[10px] font-semibold text-rose-300" role="alert">{localError || sendError}</p> : null}
    </footer>
  );
}

function ChatPane({
  conversation,
  messages,
  loading,
  messageError,
  onRetryMessages,
  onBack,
  onToggleDetails,
  onStartCall,
  onSend,
  onUpload,
  sending,
  uploading,
  sendError,
  mobileThread,
}) {
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [messages, conversation?.id]);

  if (!conversation) return <EmptyChat />;

  return (
    <section className={`${mobileThread ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col bg-[#0b161c]`} aria-label={`Chat with ${conversation.name}`}>
      <header className="z-20 flex h-[72px] shrink-0 items-center gap-2 border-b border-white/[0.06] bg-[#111d23]/95 px-2 pt-[env(safe-area-inset-top)] backdrop-blur-xl sm:px-4">
        <IconButton label="Back to conversations" className="md:hidden" onClick={onBack}><ArrowLeft size={21} /></IconButton>
        <button type="button" className="flex min-w-0 items-center gap-3 rounded-xl p-1 pr-3 text-left transition hover:bg-white/[0.04]" onClick={onToggleDetails}>
          <Avatar name={conversation.name} color={conversation.color} size="sm" online={conversation.online} />
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-extrabold text-[#edf3f4]">{conversation.name}</span>
            <span className={`block truncate text-[10px] font-medium ${conversation.online ? "text-emerald-300" : "text-[#7f929b]"}`}>{conversation.status || (conversation.online ? "online" : "last seen recently")}</span>
          </span>
        </button>
        <div className="ml-auto flex items-center gap-0.5">
          <IconButton label="Start video call" onClick={() => onStartCall("video")}><Video size={19} /></IconButton>
          <IconButton label="Start voice call" onClick={() => onStartCall("audio")}><Phone size={18} /></IconButton>
          <IconButton label="Search in conversation" className="hidden sm:grid"><Search size={18} /></IconButton>
          <IconButton label="Conversation menu"><MoreVertical size={18} /></IconButton>
        </div>
      </header>

      <div className="chat-wallpaper soft-scrollbar min-h-0 flex-1 overflow-y-auto" aria-live="polite">
        {loading ? <MessageSkeleton /> : messageError ? (
          <div className="grid min-h-full place-items-center px-6">
            <div className="max-w-sm rounded-2xl border border-rose-400/15 bg-[#18262d]/95 p-6 text-center shadow-xl">
              <WifiOff size={25} className="mx-auto text-rose-300" />
              <p className="mt-3 text-sm font-bold">Couldn’t load messages</p>
              <p className="mt-1 text-xs leading-relaxed text-white/45">{messageError}</p>
              <button type="button" onClick={onRetryMessages} className="mt-4 rounded-full bg-white/10 px-4 py-2 text-[11px] font-bold transition hover:bg-white/15">Try again</button>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col justify-end gap-2.5 px-3 py-5 sm:px-6">
            <div className="mx-auto mb-2 flex max-w-md items-start gap-2 rounded-xl border border-amber-200/10 bg-[#18262d]/90 px-3 py-2 text-center text-[9px] leading-relaxed text-amber-100/60 shadow-sm">
              <LockKeyhole size={12} className="mt-0.5 shrink-0 text-amber-200/60" />
              Messages and calls are protected with end-to-end encryption. Only people in this chat can read or share them.
            </div>
            <div className="mx-auto my-2 rounded-full bg-[#1b2a31]/90 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#80939c] shadow">Today</div>
            {!messages.length ? <p className="mx-auto my-auto max-w-xs py-10 text-center text-xs leading-relaxed text-white/35">No messages yet. Say hello and start the conversation.</p> : null}
            {messages.map((message) => <MessageBubble key={message.id} message={message} />)}
            {conversation.typing ? (
              <div className="flex justify-start">
                <div className="message-in flex items-center gap-1 bg-[#1d2b32] px-4 py-3">
                  {[0, 1, 2].map((dot) => <span key={dot} className="typing-dot h-1.5 w-1.5 rounded-full bg-white/55" />)}
                </div>
              </div>
            ) : null}
            <div ref={endRef} />
          </div>
        )}
      </div>
      <Composer
        onSend={onSend}
        onUpload={onUpload}
        sending={sending}
        uploading={uploading}
        sendError={sendError}
      />
    </section>
  );
}

function DetailRow({ icon: Icon, label, value, tone = "" }) {
  return (
    <button type="button" className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.045] ${tone}`}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.045] text-[#8da0a8]"><Icon size={17} /></span>
      <span className="min-w-0 flex-1"><span className="block text-xs font-semibold">{label}</span>{value ? <span className="mt-0.5 block truncate text-[10px] text-[#748891]">{value}</span> : null}</span>
      <ChevronRight size={15} className="text-[#657982]" />
    </button>
  );
}

function DetailsPanel({ conversation, onClose }) {
  if (!conversation) return null;
  return (
    <aside className="hidden w-[318px] shrink-0 flex-col border-l border-white/[0.07] bg-[#101b21] 2xl:flex" aria-label="Contact details">
      <header className="flex h-[72px] shrink-0 items-center gap-2 border-b border-white/[0.06] px-4">
        <IconButton label="Close contact details" onClick={onClose}><X size={19} /></IconButton>
        <h2 className="text-sm font-bold">Contact info</h2>
      </header>
      <div className="soft-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col items-center px-5 py-7 text-center">
          <Avatar name={conversation.name} color={conversation.color} size="xl" online={conversation.online} />
          <h3 className="mt-4 text-lg font-extrabold">{conversation.name}</h3>
          <p className="mt-1 text-[11px] text-[#7f929b]">{conversation.phone || "+91 98765 43210"}</p>
          <div className="mt-5 flex gap-2">
            <IconButton label="Message" active><MessageCircle size={18} /></IconButton>
            <IconButton label="Voice call"><Phone size={17} /></IconButton>
            <IconButton label="Video call"><Video size={18} /></IconButton>
          </div>
        </div>
        <div className="border-y border-white/[0.06] px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#647982]">About</p>
          <p className="mt-2 text-xs leading-relaxed text-white/75">{conversation.about || "Available for a quick chat ✨"}</p>
        </div>
        <div className="border-b border-white/[0.06] px-4 py-4">
          <div className="mb-3 flex items-center justify-between px-1"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#647982]">Media, links & docs</p><button type="button" className="text-[10px] font-bold text-emerald-300">24 ›</button></div>
          <div className="grid grid-cols-3 gap-1.5">
            {["from-[#78b2a4] to-[#173a44]", "from-[#e3ab75] to-[#664052]", "from-[#859ac9] to-[#233553]"].map((gradient, index) => <div key={gradient} className={`aspect-square rounded-lg bg-gradient-to-br ${gradient} opacity-85`} aria-label={`Shared media ${index + 1}`} />)}
          </div>
        </div>
        <div className="space-y-1 px-2 py-3 text-white/75">
          <DetailRow icon={Star} label="Starred messages" value="12 messages" />
          <DetailRow icon={BellOff} label="Mute notifications" value="Off" />
          <DetailRow icon={Timer} label="Disappearing messages" value="Off" />
          <DetailRow icon={LockKeyhole} label="Encryption" value="Messages and calls are secured" />
        </div>
        <div className="border-t border-white/[0.06] px-2 py-3">
          <DetailRow icon={ShieldAlert} label={`Block ${conversation.name.split(" ")[0]}`} tone="text-rose-300" />
        </div>
      </div>
    </aside>
  );
}

function NewChatModal({ conversations, onClose, onSelect, onCreate, creating }) {
  const [query, setQuery] = useState("");
  const [createError, setCreateError] = useState("");
  const [directory, setDirectory] = useState({ query: "", users: [], loading: false, error: "" });
  const cleanQuery = query.trim();
  const normalizedQuery = cleanQuery.toLowerCase();
  const matches = conversations.filter((item) =>
    `${item.name} ${item.email || ""}`.toLowerCase().includes(normalizedQuery),
  );
  const directoryState = directory.query === cleanQuery
    ? directory
    : { users: [], loading: false, error: "" };

  useEffect(() => {
    if (!externalApiEnabled || cleanQuery.length < 2) return undefined;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setDirectory({ query: cleanQuery, users: [], loading: true, error: "" });
      void searchUsers(cleanQuery, { signal: controller.signal })
        .then((users) => {
          if (controller.signal.aborted) return;
          setDirectory({
            query: cleanQuery,
            users: users.map((user, index) => ({
              ...user,
              name: user.name || user.displayName || nameFromEmail(user.email),
              color: user.color || fallbackColors[index % fallbackColors.length],
            })),
            loading: false,
            error: "",
          });
        })
        .catch((searchError) => {
          if (searchError?.name === "AbortError" || controller.signal.aborted) return;
          setDirectory({
            query: cleanQuery,
            users: [],
            loading: false,
            error: searchError.message || "People search is unavailable.",
          });
        });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [cleanQuery]);

  const existingEmails = new Set(conversations.map((item) => item.email).filter(Boolean));
  const newPeople = directoryState.users.filter((user) => !existingEmails.has(user.email));
  const canCreateFromEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanQuery) &&
    !existingEmails.has(cleanQuery.toLowerCase()) &&
    !newPeople.some((user) => user.email?.toLowerCase() === cleanQuery.toLowerCase());

  const create = async (person) => {
    setCreateError("");
    try {
      await onCreate(person);
      onClose();
    } catch (requestError) {
      setCreateError(requestError.message || "Couldn’t start this conversation.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4 backdrop-blur-sm" role="presentation" onMouseDown={onClose}>
      <section className="glass-popover w-full max-w-md rounded-3xl p-4" role="dialog" aria-modal="true" aria-labelledby="new-chat-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between px-1"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300">Connect</p><h2 id="new-chat-title" className="mt-1 text-xl font-extrabold">New conversation</h2></div><IconButton label="Close" onClick={onClose}><X size={19} /></IconButton></div>
        <label className="mt-4 flex h-11 items-center gap-2 rounded-xl bg-black/20 px-3 text-[#83969e]"><Search size={16} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or email" className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none" /></label>
        <button type="button" disabled title="Group creation is not available on the API yet" className="mt-3 flex w-full cursor-not-allowed items-center gap-3 rounded-xl p-2 text-left opacity-40"><span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-400/15 text-emerald-300"><UsersRound size={18} /></span><span><span className="block text-sm font-bold">New group</span><span className="text-[10px] text-white/40">Coming soon</span></span></button>
        <div className="soft-scrollbar mt-2 max-h-72 overflow-y-auto border-t border-white/[0.06] pt-2">
          {matches.map((item) => <button key={`conversation-${item.id}`} type="button" onClick={() => onSelect(item)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-white/[0.05]"><Avatar name={item.name} color={item.color} size="sm" online={item.online} /><span className="min-w-0"><span className="block truncate text-xs font-bold">{item.name}</span><span className="mt-0.5 block truncate text-[10px] text-white/40">{item.email || item.status || "Existing conversation"}</span></span><span className="ml-auto text-[9px] font-bold uppercase tracking-wider text-emerald-300/70">Open</span></button>)}
          {newPeople.map((person) => <button key={`person-${person.id || person.email}`} type="button" disabled={creating} onClick={() => void create(person)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-white/[0.05] disabled:cursor-wait disabled:opacity-55"><Avatar name={person.name} color={person.color} size="sm" /><span className="min-w-0"><span className="block truncate text-xs font-bold">{person.name}</span><span className="mt-0.5 block truncate text-[10px] text-white/40">{person.email}</span></span><span className="ml-auto text-[9px] font-bold uppercase tracking-wider text-emerald-300/70">Message</span></button>)}
          {canCreateFromEmail ? <button type="button" disabled={creating} onClick={() => void create({ email: cleanQuery.toLowerCase(), name: nameFromEmail(cleanQuery) })} className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-white/[0.05] disabled:cursor-wait disabled:opacity-55"><span className="grid h-10 w-10 place-items-center rounded-full bg-sky-400/15 text-sky-300"><MessageCircle size={18} /></span><span className="min-w-0"><span className="block text-xs font-bold">Start with {cleanQuery}</span><span className="mt-0.5 block text-[10px] text-white/40">The server will verify this account.</span></span></button> : null}
          {directoryState.loading ? <p className="px-3 py-5 text-center text-xs text-white/40">Searching people…</p> : null}
          {directoryState.error ? <p className="m-2 rounded-xl border border-rose-400/15 bg-rose-400/[0.06] px-3 py-2 text-xs text-rose-200" role="alert">{directoryState.error}</p> : null}
          {createError ? <p className="m-2 rounded-xl border border-rose-400/15 bg-rose-400/[0.06] px-3 py-2 text-xs text-rose-200" role="alert">{createError}</p> : null}
          {!directoryState.loading && !directoryState.error && cleanQuery && matches.length === 0 && newPeople.length === 0 && !canCreateFromEmail ? <p className="px-3 py-5 text-center text-xs text-white/40">No people found. Try a full email address.</p> : null}
        </div>
      </section>
    </div>
  );
}

function CallOverlay({ conversation, controls }) {
  const {
    call,
    status,
    error,
    localStream,
    remoteStream,
    localVideoRef,
    remoteVideoRef,
    isMuted,
    isCameraOff,
    isIncoming,
    isActive,
    acceptCall,
    rejectCall,
    hangUp,
    toggleMute,
    toggleCamera,
    resetCall,
  } = controls;
  const isVideo = call?.mediaType === "VIDEO";
  const ended = status === "ended" || status === "error";
  const statusLabel = {
    preparing: "Preparing your call…",
    calling: "Calling…",
    ringing: isIncoming ? "Incoming call" : "Ringing…",
    connecting: "Connecting securely…",
    reconnecting: "Reconnecting…",
    active: "Connected",
    ended: call?.endReason === "rejected" ? "Call declined" : call?.endReason === "busy" ? "Line is busy" : "Call ended",
    error: error?.message || "Call couldn’t connect",
  }[status] || "Calling…";

  const close = () => {
    if (!ended) hangUp("closed");
    resetCall();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-[#071116]/95 p-4 backdrop-blur-xl">
      <section className="relative mx-auto flex h-full max-w-5xl flex-col overflow-hidden rounded-[32px] border border-white/[0.07] bg-gradient-to-br from-[#183039] via-[#0f1d23] to-[#081217] shadow-2xl" role="dialog" aria-modal="true" aria-label={`${isVideo ? "Video" : "Voice"} call with ${conversation.name}`}>
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_50%_20%,rgba(33,202,151,.36),transparent_35%)]" />
        {isVideo && remoteStream ? <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 h-full w-full object-cover" aria-label="Remote video" /> : null}
        <header className="relative z-10 flex items-center justify-between p-5"><div className="flex items-center gap-2 rounded-full bg-black/20 px-3 py-2 text-xs text-white/65 backdrop-blur"><LockKeyhole size={14} /> End-to-end encrypted</div><IconButton label="Close call" onClick={close} className="bg-black/20 backdrop-blur"><X size={20} /></IconButton></header>
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center text-center">
          {isVideo && localStream && !remoteStream ? <video ref={localVideoRef} autoPlay muted playsInline className="mb-2 h-52 w-36 rounded-[26px] border border-white/10 object-cover shadow-2xl sm:h-64 sm:w-48" aria-label="Your video" /> : <Avatar name={conversation.name} color={conversation.color} size="xl" online={isActive} />}
          <h2 className="mt-5 text-2xl font-extrabold">{conversation.name}</h2>
          <p className={`mt-2 text-sm ${status === "error" ? "text-rose-300" : "text-emerald-300"}`}>{statusLabel}</p>
          <p className="mt-2 max-w-sm px-6 text-xs leading-relaxed text-white/35">{call?.demo ? "Demo call preview — connect the Spring API for live peer-to-peer calls." : "WebRTC media · authenticated WebSocket signaling"}</p>
        </div>
        {isVideo && localStream && remoteStream ? <video ref={localVideoRef} autoPlay muted playsInline className="absolute bottom-28 right-5 z-20 h-36 w-24 rounded-2xl border-2 border-white/10 object-cover shadow-2xl sm:h-48 sm:w-32" aria-label="Your video" /> : null}
        <div className="relative z-10 mx-auto mb-8 flex items-center gap-3 rounded-3xl border border-white/[0.07] bg-black/25 p-3 backdrop-blur-xl">
          {isIncoming && status === "ringing" ? (
            <>
              <button type="button" onClick={() => rejectCall()} className="grid h-12 w-16 place-items-center rounded-2xl bg-rose-500 text-white transition hover:bg-rose-400" aria-label="Decline call"><Phone size={21} className="rotate-[135deg]" /></button>
              <button type="button" onClick={() => void acceptCall().catch(() => {})} className="grid h-12 w-16 place-items-center rounded-2xl bg-emerald-400 text-[#06271e] transition hover:bg-emerald-300" aria-label="Accept call"><Phone size={21} /></button>
            </>
          ) : ended ? (
            <button type="button" onClick={resetCall} className="h-12 rounded-2xl bg-white px-6 text-sm font-extrabold text-[#102027] transition hover:bg-emerald-100">Back to chat</button>
          ) : (
            <>
              <button type="button" onClick={toggleMute} className={`grid h-12 w-12 place-items-center rounded-2xl transition ${isMuted ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/15"}`} aria-label={isMuted ? "Unmute" : "Mute"}><Mic size={20} /></button>
              {isVideo ? <button type="button" onClick={toggleCamera} className={`grid h-12 w-12 place-items-center rounded-2xl transition ${isCameraOff ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/15"}`} aria-label={isCameraOff ? "Turn camera on" : "Turn camera off"}><Video size={20} /></button> : null}
              <button type="button" onClick={() => hangUp()} className="grid h-12 w-16 place-items-center rounded-2xl bg-rose-500 text-white transition hover:bg-rose-400" aria-label="End call"><Phone size={21} className="rotate-[135deg]" /></button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default function MessengerApp() {
  const [authReady, setAuthReady] = useState(!externalApiEnabled);
  const [authenticated, setAuthenticated] = useState(!externalApiEnabled);
  const [accessToken, setAccessToken] = useState("");
  const [currentUser, setCurrentUser] = useState(
    externalApiEnabled ? null : { id: "me", email: "demo@wavely.local", name: "Rohit Samota" },
  );
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [chatError, setChatError] = useState("");
  const [messageError, setMessageError] = useState("");
  const [sendError, setSendError] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [mobileThread, setMobileThread] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);
  const [nav, setNav] = useState("chats");
  const callControls = useCall({ token: externalApiEnabled ? accessToken : "" });

  const loadConversations = useCallback(async ({ silent = false, signal } = {}) => {
    if (!silent) {
      setLoadingChats(true);
      setChatError("");
    }
    try {
      const result = await getConversations({ signal });
      const items = unwrapList(result, "conversations");
      const normalized = items.map(normalizeConversation);
      setConversations((current) => normalized.map((conversation) => {
        const previous = current.find((item) => String(item.id) === String(conversation.id));
        return previous ? { ...previous, ...conversation } : conversation;
      }));
      setSelected((current) => {
        if (current) {
          const refreshed = normalized.find((item) => String(item.id) === String(current.id));
          return refreshed ? { ...current, ...refreshed } : current;
        }
        return normalized[0] || (externalApiEnabled ? null : fallbackConversation);
      });
    } catch (requestError) {
      if (requestError?.name === "AbortError") return;
      if (!silent) {
        setChatError(requestError.message || "Unable to load conversations");
        if (!externalApiEnabled) setSelected((current) => current || fallbackConversation);
      }
    } finally {
      if (!signal?.aborted && !silent) setLoadingChats(false);
    }
  }, []);

  const loadMessagesFor = useCallback(async (conversation, { silent = false, signal } = {}) => {
    if (!conversation?.id) return;
    if (!silent) {
      setLoadingMessages(true);
      setMessageError("");
    }
    try {
      const result = await getMessages(conversation.id, { signal });
      const normalized = unwrapList(result, "messages")
        .map((message) => normalizeMessage(message, currentUser?.id));
      setMessages((current) => {
        if (!silent) return normalized;
        const pending = current.filter((message) =>
          String(message.conversationId) === String(conversation.id) &&
          ["sending", "uploading", "failed"].includes(message.status),
        );
        return pending.reduce((items, message) => upsertMessage(items, message), normalized);
      });
      setConversations((items) => items.map((item) =>
        String(item.id) === String(conversation.id) ? { ...item, unread: 0 } : item,
      ));
      const latestIncoming = [...normalized]
        .reverse()
        .find((message) => message.direction === "incoming" && Number(message.id) > 0);
      if (latestIncoming) {
        void markMessagesRead(conversation.id, latestIncoming.id).catch(() => {});
      }
    } catch (requestError) {
      if (requestError?.name === "AbortError") return;
      if (!silent) {
        setMessages([]);
        setMessageError(requestError.message || "Unable to load messages.");
      }
    } finally {
      if (!signal?.aborted && !silent) setLoadingMessages(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (!externalApiEnabled) return undefined;
    const syncSession = (session = getAuthSession()) => {
      const token = session?.accessToken || "";
      const sessionEmail = String(session?.email || "").toLowerCase();
      setAccessToken(token);
      setAuthenticated(Boolean(token));
      setCurrentUser((user) => {
        if (!token) return null;
        if (user?.email && String(user.email).toLowerCase() === sessionEmail) return user;
        return sessionEmail ? {
          id: null,
          email: sessionEmail,
          name: nameFromEmail(sessionEmail),
        } : null;
      });
      setAuthReady(true);
    };
    const unsubscribe = subscribeAuthSession(syncSession);
    const frame = window.requestAnimationFrame(() => syncSession());
    return () => {
      unsubscribe();
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!authenticated) return undefined;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void getCurrentUser({ signal: controller.signal })
        .then((user) => {
          if (!controller.signal.aborted) setCurrentUser(user);
        })
        .catch((requestError) => {
          if (requestError?.name !== "AbortError") {
            setSendError(requestError.message || "Your profile could not be loaded.");
          }
        });
      void loadConversations({ signal: controller.signal });
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [authenticated, loadConversations]);

  useEffect(() => {
    if (!selected?.id) return undefined;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void loadMessagesFor(selected, { signal: controller.signal });
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadMessagesFor, selected]);

  const handleRealtimeMessage = useCallback((event) => {
    const payload = event.payload?.message || event.payload || {};
    const conversationId =
      event.conversationId ?? payload.conversationId ?? payload.conversionId;
    if (conversationId == null) return;
    const normalized = normalizeMessage({
      ...payload,
      conversationId,
      createdAt: payload.createdAt || event.occurredAt,
    }, currentUser?.id);
    const selectedNow = String(selected?.id) === String(conversationId);
    const outgoing = normalized.direction === "outgoing";

    if (selectedNow) {
      setMessages((items) => upsertMessage(items, normalized));
    }

    const preview = normalized.type === "text"
      ? normalized.text
      : normalized.type === "audio" || normalized.type === "voice"
        ? "Voice message"
        : normalized.type === "image"
          ? "Photo"
          : normalized.type === "video"
            ? "Video"
            : "Attachment";
    const conversationExists = conversations.some((item) => String(item.id) === String(conversationId));
    setConversations((items) => items.map((item) =>
      String(item.id) === String(conversationId)
        ? {
            ...item,
            lastMessage: preview,
            lastMessageAt: formatTimestamp(normalized.createdAt || event.occurredAt, { list: true }),
            mine: outgoing,
            unread: !outgoing && !selectedNow ? Number(item.unread || 0) + 1 : 0,
          }
        : item,
    ));
    if (!conversationExists) void loadConversations({ silent: true });

    if (!outgoing && Number(normalized.id) > 0) {
      const acknowledge = selectedNow ? markMessagesRead : markMessagesDelivered;
      void acknowledge(conversationId, normalized.id).catch(() => {});
    }
  }, [conversations, currentUser?.id, loadConversations, selected?.id]);

  const handleRealtimeReceipt = useCallback((event) => {
    const payload = event.payload || {};
    const conversationId = event.conversationId ?? payload.conversationId ?? payload.conversionId;
    if (String(selected?.id) !== String(conversationId)) return;
    if (currentUser?.id != null && String(payload.recipientUserId) === String(currentUser.id)) return;
    const boundary = Number(payload.upToMessageId ?? payload.messageId);
    const nextStatus = String(payload.state || payload.status || "sent").toLowerCase();
    const ranks = { sending: 0, sent: 1, delivered: 2, read: 3 };
    setMessages((items) => items.map((message) => {
      if (message.direction !== "outgoing" || !Number.isFinite(boundary) || Number(message.id) > boundary) {
        return message;
      }
      return (ranks[nextStatus] || 0) > (ranks[message.status] || 0)
        ? { ...message, status: nextStatus }
        : message;
    }));
  }, [currentUser, selected]);

  const handleRealtimeConversation = useCallback(() => {
    void loadConversations({ silent: true });
  }, [loadConversations]);

  const realtime = useRealtimeChat({
    token: externalApiEnabled ? accessToken : "",
    enabled: authenticated && externalApiEnabled,
    onMessage: handleRealtimeMessage,
    onReceipt: handleRealtimeReceipt,
    onConversation: handleRealtimeConversation,
  });

  useEffect(() => {
    if (!authenticated || !externalApiEnabled || realtime.isConnected) return undefined;
    const timer = window.setInterval(() => {
      void loadConversations({ silent: true });
      if (selected?.id) void loadMessagesFor(selected, { silent: true });
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [authenticated, loadConversations, loadMessagesFor, realtime.isConnected, selected]);

  const selectConversation = (conversation) => {
    setLoadingMessages(true);
    setMessageError("");
    setSendError("");
    setMessages([]);
    setSelected(conversation);
    setMobileThread(true);
    setConversations((items) => items.map((item) => String(item.id) === String(conversation.id) ? { ...item, unread: 0 } : item));
  };

  const handleSend = async ({ text }) => {
    if (!selected) return;
    const clientMessageId = globalThis.crypto?.randomUUID?.() || `web-${Date.now()}`;
    const optimistic = {
      id: `temp-${clientMessageId}`,
      clientMessageId,
      conversationId: selected.id,
      sender: "me",
      senderUserId: currentUser?.id,
      direction: "outgoing",
      type: "text",
      text,
      createdAt: new Date().toISOString(),
      time: formatTimestamp(new Date()),
      status: "sending",
    };
    setMessages((items) => upsertMessage(items, optimistic));
    setSendError("");
    setSending(true);
    try {
      const result = await sendMessage(selected.id, { text, type: "text", clientMessageId });
      const saved = result?.message || result;
      if (saved?.id) {
        const normalized = normalizeMessage(saved, currentUser?.id);
        setMessages((items) => upsertMessage(items, {
          ...optimistic,
          ...normalized,
          direction: "outgoing",
        }, optimistic.id));
      }
      setConversations((items) => items.map((item) => String(item.id) === String(selected.id) ? { ...item, lastMessage: text, lastMessageAt: "now", mine: true } : item));
    } catch (requestError) {
      setMessages((items) => items.map((item) => item.id === optimistic.id ? { ...item, status: "failed" } : item));
      setSendError(requestError.message || "Message not sent.");
      throw requestError;
    } finally {
      setSending(false);
    }
  };

  const handleUpload = async (file, metadata = {}) => {
    if (!selected) return;
    const type = metadata.type || mediaTypeFromFile(file);
    if (!type) throw new Error("Choose an image, video, or audio file.");
    const clientMessageId = globalThis.crypto?.randomUUID?.() || `web-${Date.now()}`;
    const localUrl = URL.createObjectURL(file);
    const duration = metadata.duration
      ? `${Math.floor(metadata.duration / 60)}:${String(metadata.duration % 60).padStart(2, "0")}`
      : null;
    const optimistic = {
      id: `temp-${clientMessageId}`,
      clientMessageId,
      conversationId: selected.id,
      sender: "me",
      senderUserId: currentUser?.id,
      direction: "outgoing",
      type,
      text: "",
      caption: "",
      media: { url: localUrl, contentType: file.type, alt: file.name },
      duration,
      createdAt: new Date().toISOString(),
      time: formatTimestamp(new Date()),
      status: "uploading",
    };
    setMessages((items) => upsertMessage(items, optimistic));
    setSendError("");
    setUploading(true);
    try {
      const uploaded = await uploadMedia(selected.id, file);
      const mediaUrl = uploaded.url || uploaded.path || uploaded.downloadUrl;
      if (!mediaUrl) throw new Error("The server did not return a media URL.");
      const uploadedType = String(uploaded.messageType || type).toLowerCase();
      const uploadedMedia = {
        url: mediaUrl,
        contentType: uploaded.contentType || file.type,
        alt: uploaded.originalFilename || uploaded.fileName || file.name,
      };
      const result = await sendMessage(selected.id, {
        clientMessageId,
        type: uploadedType,
        content: mediaUrl,
        media: uploadedMedia,
        duration: metadata.duration ?? null,
      });
      const saved = result?.message || result;
      const normalized = normalizeMessage(saved, currentUser?.id);
      setMessages((items) => upsertMessage(items, {
        ...optimistic,
        ...normalized,
        direction: "outgoing",
        type: uploadedType,
        duration,
        media: uploadedMedia,
      }, optimistic.id));
      URL.revokeObjectURL(localUrl);
      const preview = uploadedType === "audio" ? "Voice message" : uploadedType === "image" ? "Photo" : "Video";
      setConversations((items) => items.map((item) => String(item.id) === String(selected.id) ? { ...item, lastMessage: preview, lastMessageAt: "now", mine: true } : item));
    } catch (requestError) {
      setMessages((items) => items.map((item) => item.id === optimistic.id ? { ...item, status: "failed" } : item));
      setSendError(requestError.message || "Attachment not sent.");
      throw requestError;
    } finally {
      setUploading(false);
    }
  };

  const handleCreateChat = async (person) => {
    setCreatingChat(true);
    try {
      const created = await createConversation({ recipientEmail: person.email });
      const conversation = normalizeConversation({
        ...created,
        peer: created.peer || person,
        recipientEmail: person.email,
      }, conversations.length);
      setConversations((items) => {
        const withoutCurrent = items.filter((item) => String(item.id) !== String(conversation.id));
        return [conversation, ...withoutCurrent];
      });
      selectConversation(conversation);
      return conversation;
    } finally {
      setCreatingChat(false);
    }
  };

  const startSelectedCall = async (type) => {
    if (!selected) return;
    try {
      await callControls.startCall({
        conversationId: selected.signalConversationId || selected.id,
        mediaType: type === "video" ? "VIDEO" : "AUDIO",
      });
    } catch {
      // The call overlay displays permission, socket, and WebRTC errors.
    }
  };

  const activeCallConversation = callControls.call
    ? conversations.find((item) => String(item.signalConversationId || item.id) === String(callControls.call.conversationId)) || selected || fallbackConversation
    : null;

  const handleAuthenticated = (session) => {
    const token = session?.accessToken || getAccessToken() || "";
    if (!token) throw new Error("The authentication service did not return a valid session.");
    setAccessToken(token);
    setCurrentUser(session?.email ? {
      id: null,
      email: session.email,
      name: nameFromEmail(session.email),
    } : null);
    setAuthenticated(true);
  };

  if (!authReady) {
    return <div className="grid min-h-screen place-items-center bg-[#071116]"><span className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-300 border-t-transparent" /></div>;
  }

  if (!authenticated) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="app-frame flex overflow-hidden rounded-[26px] border border-white/[0.08] bg-[#0b161c]">
      <NavRail current={nav} onChange={setNav} />
      <Sidebar conversations={conversations} selectedId={selected?.id} onSelect={selectConversation} loading={loadingChats} error={chatError} onRetry={() => loadConversations()} onNewChat={() => setNewChatOpen(true)} mobileThread={mobileThread} connectionStatus={realtime.connectionStatus} />
      <ChatPane conversation={selected} messages={messages} loading={loadingMessages} messageError={messageError} onRetryMessages={() => loadMessagesFor(selected)} onBack={() => setMobileThread(false)} onToggleDetails={() => setDetailsOpen((value) => !value)} onStartCall={startSelectedCall} onSend={handleSend} onUpload={handleUpload} sending={sending} uploading={uploading} sendError={sendError} mobileThread={mobileThread} />
      {detailsOpen ? <DetailsPanel conversation={selected} onClose={() => setDetailsOpen(false)} /> : null}
      {newChatOpen ? <NewChatModal conversations={conversations} onClose={() => setNewChatOpen(false)} onSelect={(conversation) => { selectConversation(conversation); setNewChatOpen(false); }} onCreate={handleCreateChat} creating={creatingChat} /> : null}
      {callControls.call && activeCallConversation ? <CallOverlay conversation={activeCallConversation} controls={callControls} /> : null}
    </div>
  );
}
