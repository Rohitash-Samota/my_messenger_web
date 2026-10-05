const avatar = (initials, color, image = null) => ({
  initials,
  color,
  image,
});

export const currentUser = {
  id: "me",
  name: "Rohit Samota",
  phone: "+91 98765 43210",
  about: "Building thoughtful things, one conversation at a time.",
  avatar: avatar("RS", "#0E766E"),
};

const people = {
  priya: {
    id: "priya-shah",
    name: "Priya Shah",
    phone: "+91 98201 34782",
    about: "Designing calm into complicated products.",
    avatar: avatar(
      "PS",
      "#D96C75",
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80",
    ),
  },
  arjun: {
    id: "arjun-mehta",
    name: "Arjun Mehta",
    phone: "+91 99870 11443",
    about: "Coffee, code, and long runs.",
    avatar: avatar(
      "AM",
      "#577590",
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80",
    ),
  },
  maa: {
    id: "maa",
    name: "Maa",
    phone: "+91 94141 22689",
    about: "Available",
    avatar: avatar("M", "#B7791F"),
  },
  neha: {
    id: "neha-verma",
    name: "Neha Verma",
    phone: "+91 99202 77431",
    about: "Usually outdoors 🌿",
    avatar: avatar(
      "NV",
      "#588157",
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=160&q=80",
    ),
  },
  kabir: {
    id: "kabir-khan",
    name: "Kabir Khan",
    phone: "+91 98199 01827",
    about: "On set. Text, don't call.",
    avatar: avatar(
      "KK",
      "#5B5F97",
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=160&q=80",
    ),
  },
  ananya: {
    id: "ananya-iyer",
    name: "Ananya Iyer",
    phone: "+91 98409 42218",
    about: "Books, beaches, filter coffee.",
    avatar: avatar(
      "AI",
      "#9C6644",
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80",
    ),
  },
  dev: {
    id: "dev-malhotra",
    name: "Dev Malhotra",
    avatar: avatar("DM", "#7C3AED"),
  },
  sana: {
    id: "sana-khan",
    name: "Sana Khan",
    avatar: avatar("SK", "#DB2777"),
  },
  vikram: {
    id: "vikram-rao",
    name: "Vikram Rao",
    avatar: avatar("VR", "#2563EB"),
  },
  tara: {
    id: "tara-sen",
    name: "Tara Sen",
    avatar: avatar("TS", "#EA580C"),
  },
};

const member = (person, role = "member") => ({
  id: person.id,
  name: person.name,
  avatar: person.avatar,
  role,
});

const me = member(currentUser, "admin");

export const mockConversations = [
  {
    id: "priya-shah",
    name: "Priya Shah",
    avatar: people.priya.avatar,
    type: "direct",
    lastMessage: "That colour system is perfect ✨",
    lastMessageAt: "2026-10-03T10:42:00.000Z",
    unread: 2,
    pinned: true,
    muted: false,
    online: true,
    status: "online",
    about: people.priya.about,
    phone: people.priya.phone,
    members: [me, member(people.priya)],
  },
  {
    id: "product-studio",
    name: "Product Studio",
    avatar: avatar("PS", "#1F8A70"),
    type: "group",
    lastMessage: "Sana: Sharing the final prototype in 10 🚀",
    lastMessageAt: "2026-10-03T10:18:00.000Z",
    unread: 5,
    pinned: true,
    muted: false,
    online: false,
    status: "6 members",
    about: "Ideas, experiments, and everything we ship.",
    phone: null,
    members: [
      me,
      member(people.priya, "admin"),
      member(people.dev),
      member(people.sana),
      member(people.vikram),
      member(people.tara),
    ],
  },
  {
    id: "maa",
    name: "Maa",
    avatar: people.maa.avatar,
    type: "direct",
    lastMessage: "Call me when you finish work ❤️",
    lastMessageAt: "2026-10-03T08:05:00.000Z",
    unread: 0,
    pinned: true,
    muted: false,
    online: false,
    status: "last seen today at 1:38 PM",
    about: people.maa.about,
    phone: people.maa.phone,
    members: [me, member(people.maa)],
  },
  {
    id: "arjun-mehta",
    name: "Arjun Mehta",
    avatar: people.arjun.avatar,
    type: "direct",
    lastMessage: "Voice message",
    lastMessageAt: "2026-10-03T07:31:00.000Z",
    unread: 1,
    pinned: false,
    muted: false,
    online: true,
    status: "online",
    about: people.arjun.about,
    phone: people.arjun.phone,
    members: [me, member(people.arjun)],
  },
  {
    id: "weekend-wanderers",
    name: "Weekend Wanderers",
    avatar: avatar(
      "WW",
      "#2A9D8F",
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=160&q=80",
    ),
    type: "group",
    lastMessage: "Neha: Sunrise point is only a 20-min walk",
    lastMessageAt: "2026-10-03T06:54:00.000Z",
    unread: 0,
    pinned: false,
    muted: true,
    online: false,
    status: "8 members",
    about: "One trail, one playlist, too many snacks.",
    phone: null,
    members: [
      me,
      member(people.neha, "admin"),
      member(people.arjun),
      member(people.kabir),
      member(people.ananya),
      member(people.dev),
      member(people.sana),
      member(people.vikram),
    ],
  },
  {
    id: "neha-verma",
    name: "Neha Verma",
    avatar: people.neha.avatar,
    type: "direct",
    lastMessage: "Photo",
    lastMessageAt: "2026-10-02T17:46:00.000Z",
    unread: 0,
    pinned: false,
    muted: false,
    online: false,
    status: "last seen yesterday at 11:22 PM",
    about: people.neha.about,
    phone: people.neha.phone,
    members: [me, member(people.neha)],
  },
  {
    id: "design-circle",
    name: "Design Circle",
    avatar: avatar("DC", "#8B5CF6"),
    type: "group",
    lastMessage: "Tara: The accessibility notes are in the doc",
    lastMessageAt: "2026-10-02T14:20:00.000Z",
    unread: 12,
    pinned: false,
    muted: true,
    online: false,
    status: "24 members",
    about: "A kind corner for critique, craft, and career questions.",
    phone: null,
    members: [me, member(people.priya, "admin"), member(people.tara), member(people.sana)],
  },
  {
    id: "kabir-khan",
    name: "Kabir Khan",
    avatar: people.kabir.avatar,
    type: "direct",
    lastMessage: "Let's lock Tuesday, 4 PM.",
    lastMessageAt: "2026-10-01T11:12:00.000Z",
    unread: 0,
    pinned: false,
    muted: false,
    online: false,
    status: "last seen Wednesday at 8:10 PM",
    about: people.kabir.about,
    phone: people.kabir.phone,
    members: [me, member(people.kabir)],
  },
  {
    id: "ananya-iyer",
    name: "Ananya Iyer",
    avatar: people.ananya.avatar,
    type: "direct",
    lastMessage: "That book is officially next on my list 📚",
    lastMessageAt: "2026-09-30T16:58:00.000Z",
    unread: 0,
    pinned: false,
    muted: false,
    online: false,
    status: "last seen Monday at 10:28 PM",
    about: people.ananya.about,
    phone: people.ananya.phone,
    members: [me, member(people.ananya)],
  },
  {
    id: "saved-messages",
    name: "Saved messages",
    avatar: avatar("★", "#136F63"),
    type: "direct",
    lastMessage: "Flight options for December",
    lastMessageAt: "2026-09-28T09:15:00.000Z",
    unread: 0,
    pinned: false,
    muted: false,
    online: false,
    status: "Message yourself",
    about: "Keep notes, links, and reminders close by.",
    phone: currentUser.phone,
    members: [me],
  },
];

const textMessage = ({
  id,
  conversationId,
  sender,
  direction,
  text,
  time,
  status = "read",
  replyTo = null,
  reactions = [],
}) => ({
  id,
  conversationId,
  sender,
  direction,
  type: "text",
  text,
  time,
  status,
  replyTo,
  reactions,
  media: null,
  file: null,
  duration: null,
});

const richMessage = ({
  id,
  conversationId,
  sender,
  direction,
  type,
  text = "",
  time,
  status = "read",
  replyTo = null,
  reactions = [],
  media = null,
  file = null,
  duration = null,
}) => ({
  id,
  conversationId,
  sender,
  direction,
  type,
  text,
  time,
  status,
  replyTo,
  reactions,
  media,
  file,
  duration,
});

export const mockMessages = {
  "priya-shah": [
    textMessage({
      id: "priya-001",
      conversationId: "priya-shah",
      sender: "Priya Shah",
      direction: "incoming",
      text: "Morning! I cleaned up the onboarding flow last night.",
      time: "2026-10-03T09:14:00.000Z",
    }),
    textMessage({
      id: "priya-002",
      conversationId: "priya-shah",
      sender: "Rohit Samota",
      direction: "outgoing",
      text: "Good morning! That was fast 😄 Can I see the latest frames?",
      time: "2026-10-03T09:17:00.000Z",
    }),
    richMessage({
      id: "priya-003",
      conversationId: "priya-shah",
      sender: "Priya Shah",
      direction: "incoming",
      type: "image",
      text: "Here’s the new welcome screen. The illustration feels much warmer now.",
      time: "2026-10-03T09:23:00.000Z",
      media: {
        url: "https://images.unsplash.com/photo-1551650975-87deedd944c3?auto=format&fit=crop&w=900&q=82",
        thumbnailUrl: "https://images.unsplash.com/photo-1551650975-87deedd944c3?auto=format&fit=crop&w=480&q=72",
        alt: "Mobile product interface on a desk",
        width: 900,
        height: 600,
      },
    }),
    textMessage({
      id: "priya-004",
      conversationId: "priya-shah",
      sender: "Rohit Samota",
      direction: "outgoing",
      text: "Love the breathing room. The primary action is much easier to spot.",
      time: "2026-10-03T09:28:00.000Z",
      reactions: [{ emoji: "💚", by: ["Priya Shah"] }],
    }),
    textMessage({
      id: "priya-005",
      conversationId: "priya-shah",
      sender: "Rohit Samota",
      direction: "outgoing",
      text: "Should we carry that sage tone into the empty states too?",
      time: "2026-10-03T10:34:00.000Z",
      status: "read",
    }),
    textMessage({
      id: "priya-006",
      conversationId: "priya-shah",
      sender: "Priya Shah",
      direction: "incoming",
      text: "Yes — but one shade softer so it doesn’t compete with content.",
      time: "2026-10-03T10:38:00.000Z",
      replyTo: {
        id: "priya-005",
        sender: "Rohit Samota",
        text: "Should we carry that sage tone into the empty states too?",
      },
    }),
    textMessage({
      id: "priya-007",
      conversationId: "priya-shah",
      sender: "Priya Shah",
      direction: "incoming",
      text: "That colour system is perfect ✨",
      time: "2026-10-03T10:42:00.000Z",
      status: "delivered",
    }),
  ],
  "product-studio": [
    richMessage({
      id: "studio-001",
      conversationId: "product-studio",
      sender: "System",
      direction: "incoming",
      type: "system",
      text: "Priya changed the group description",
      time: "2026-10-03T07:55:00.000Z",
      status: "read",
    }),
    textMessage({
      id: "studio-002",
      conversationId: "product-studio",
      sender: "Dev Malhotra",
      direction: "incoming",
      text: "The staging build is up. Search and keyboard navigation are both in.",
      time: "2026-10-03T08:32:00.000Z",
    }),
    richMessage({
      id: "studio-003",
      conversationId: "product-studio",
      sender: "Dev Malhotra",
      direction: "incoming",
      type: "document",
      text: "Release notes for today’s review",
      time: "2026-10-03T08:35:00.000Z",
      file: {
        name: "Relay — release notes.pdf",
        size: 842310,
        sizeLabel: "822 KB",
        mimeType: "application/pdf",
        url: null,
      },
    }),
    textMessage({
      id: "studio-004",
      conversationId: "product-studio",
      sender: "Rohit Samota",
      direction: "outgoing",
      text: "Nice. I’ll run through the critical paths before stand-up.",
      time: "2026-10-03T08:43:00.000Z",
      reactions: [
        { emoji: "🙌", by: ["Dev Malhotra", "Sana Khan"] },
        { emoji: "✅", by: ["Priya Shah"] },
      ],
    }),
    textMessage({
      id: "studio-005",
      conversationId: "product-studio",
      sender: "Vikram Rao",
      direction: "incoming",
      text: "Analytics events are landing correctly too. We’re good from data.",
      time: "2026-10-03T09:06:00.000Z",
    }),
    textMessage({
      id: "studio-006",
      conversationId: "product-studio",
      sender: "Priya Shah",
      direction: "incoming",
      text: "I added the final empty and error states to the prototype.",
      time: "2026-10-03T09:48:00.000Z",
    }),
    textMessage({
      id: "studio-007",
      conversationId: "product-studio",
      sender: "Rohit Samota",
      direction: "outgoing",
      text: "Perfect. Let’s use the 11 AM review to make the final call.",
      time: "2026-10-03T10:02:00.000Z",
      status: "read",
    }),
    textMessage({
      id: "studio-008",
      conversationId: "product-studio",
      sender: "Sana Khan",
      direction: "incoming",
      text: "Sharing the final prototype in 10 🚀",
      time: "2026-10-03T10:18:00.000Z",
      status: "delivered",
    }),
  ],
  maa: [
    textMessage({
      id: "maa-001",
      conversationId: "maa",
      sender: "Maa",
      direction: "incoming",
      text: "Good morning beta. Had breakfast?",
      time: "2026-10-03T05:18:00.000Z",
    }),
    textMessage({
      id: "maa-002",
      conversationId: "maa",
      sender: "Rohit Samota",
      direction: "outgoing",
      text: "Good morning! Yes, poha and chai. How are you feeling today?",
      time: "2026-10-03T05:27:00.000Z",
    }),
    textMessage({
      id: "maa-003",
      conversationId: "maa",
      sender: "Maa",
      direction: "incoming",
      text: "Much better. Your parcel came this morning.",
      time: "2026-10-03T05:32:00.000Z",
    }),
    textMessage({
      id: "maa-004",
      conversationId: "maa",
      sender: "Rohit Samota",
      direction: "outgoing",
      text: "Great, please keep it on my desk. I’ll open it on Sunday.",
      time: "2026-10-03T05:40:00.000Z",
      status: "read",
    }),
    textMessage({
      id: "maa-005",
      conversationId: "maa",
      sender: "Maa",
      direction: "incoming",
      text: "Call me when you finish work ❤️",
      time: "2026-10-03T08:05:00.000Z",
    }),
  ],
  "arjun-mehta": [
    textMessage({
      id: "arjun-001",
      conversationId: "arjun-mehta",
      sender: "Arjun Mehta",
      direction: "incoming",
      text: "Are we still running tomorrow morning?",
      time: "2026-10-03T06:56:00.000Z",
    }),
    textMessage({
      id: "arjun-002",
      conversationId: "arjun-mehta",
      sender: "Rohit Samota",
      direction: "outgoing",
      text: "Absolutely. Same route, 6:30?",
      time: "2026-10-03T07:02:00.000Z",
      status: "read",
    }),
    textMessage({
      id: "arjun-003",
      conversationId: "arjun-mehta",
      sender: "Arjun Mehta",
      direction: "incoming",
      text: "6:30 works. I found a quieter loop after the lake.",
      time: "2026-10-03T07:08:00.000Z",
    }),
    richMessage({
      id: "arjun-004",
      conversationId: "arjun-mehta",
      sender: "Arjun Mehta",
      direction: "incoming",
      type: "audio",
      text: "",
      time: "2026-10-03T07:31:00.000Z",
      status: "delivered",
      duration: 23,
      media: { url: null, waveform: [2, 5, 3, 7, 9, 4, 8, 5, 11, 7, 4, 8, 3, 6, 2] },
    }),
  ],
  "weekend-wanderers": [
    textMessage({
      id: "weekend-001",
      conversationId: "weekend-wanderers",
      sender: "Neha Verma",
      direction: "incoming",
      text: "Weather looks clear for Matheran this weekend!",
      time: "2026-10-03T06:14:00.000Z",
    }),
    textMessage({
      id: "weekend-002",
      conversationId: "weekend-wanderers",
      sender: "Kabir Khan",
      direction: "incoming",
      text: "I can drive. Four people plus backpacks should fit comfortably.",
      time: "2026-10-03T06:21:00.000Z",
    }),
    textMessage({
      id: "weekend-003",
      conversationId: "weekend-wanderers",
      sender: "Rohit Samota",
      direction: "outgoing",
      text: "Count me in. I’ll bring the first-aid kit and enough coffee for everyone.",
      time: "2026-10-03T06:29:00.000Z",
      reactions: [{ emoji: "☕", by: ["Neha Verma", "Arjun Mehta", "Ananya Iyer"] }],
    }),
    richMessage({
      id: "weekend-004",
      conversationId: "weekend-wanderers",
      sender: "Neha Verma",
      direction: "incoming",
      type: "image",
      text: "This is the trail I was talking about 🌄",
      time: "2026-10-03T06:42:00.000Z",
      media: {
        url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=82",
        thumbnailUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=480&q=72",
        alt: "Mountain trail at sunrise",
        width: 1000,
        height: 667,
      },
    }),
    textMessage({
      id: "weekend-005",
      conversationId: "weekend-wanderers",
      sender: "Ananya Iyer",
      direction: "incoming",
      text: "Sold. What time do we need to leave?",
      time: "2026-10-03T06:47:00.000Z",
    }),
    textMessage({
      id: "weekend-006",
      conversationId: "weekend-wanderers",
      sender: "Neha Verma",
      direction: "incoming",
      text: "Sunrise point is only a 20-min walk from the parking area.",
      time: "2026-10-03T06:54:00.000Z",
    }),
  ],
  "neha-verma": [
    textMessage({
      id: "neha-001",
      conversationId: "neha-verma",
      sender: "Rohit Samota",
      direction: "outgoing",
      text: "How did the pottery class go?",
      time: "2026-10-02T17:18:00.000Z",
      status: "read",
    }),
    textMessage({
      id: "neha-002",
      conversationId: "neha-verma",
      sender: "Neha Verma",
      direction: "incoming",
      text: "Messy, meditative, and surprisingly fun.",
      time: "2026-10-02T17:35:00.000Z",
    }),
    richMessage({
      id: "neha-003",
      conversationId: "neha-verma",
      sender: "Neha Verma",
      direction: "incoming",
      type: "image",
      text: "My very wonky first bowl 😅",
      time: "2026-10-02T17:46:00.000Z",
      media: {
        url: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=900&q=82",
        thumbnailUrl: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=480&q=72",
        alt: "Handmade ceramic bowls",
        width: 900,
        height: 600,
      },
      reactions: [{ emoji: "😍", by: ["Rohit Samota"] }],
    }),
  ],
  "design-circle": [
    textMessage({
      id: "design-001",
      conversationId: "design-circle",
      sender: "Priya Shah",
      direction: "incoming",
      text: "Dropping a reminder: critique starts at 6 PM today.",
      time: "2026-10-02T12:02:00.000Z",
    }),
    textMessage({
      id: "design-002",
      conversationId: "design-circle",
      sender: "Sana Khan",
      direction: "incoming",
      text: "Can we spend ten minutes on focus order? I’m seeing two edge cases.",
      time: "2026-10-02T12:18:00.000Z",
    }),
    textMessage({
      id: "design-003",
      conversationId: "design-circle",
      sender: "Rohit Samota",
      direction: "outgoing",
      text: "Yes, add them to the board and we’ll start there.",
      time: "2026-10-02T12:24:00.000Z",
      status: "read",
    }),
    richMessage({
      id: "design-004",
      conversationId: "design-circle",
      sender: "Tara Sen",
      direction: "incoming",
      type: "document",
      text: "The accessibility notes are in the doc.",
      time: "2026-10-02T14:20:00.000Z",
      file: {
        name: "Accessibility review — Oct 3.pdf",
        size: 1243210,
        sizeLabel: "1.2 MB",
        mimeType: "application/pdf",
        url: null,
      },
    }),
  ],
  "kabir-khan": [
    textMessage({
      id: "kabir-001",
      conversationId: "kabir-khan",
      sender: "Kabir Khan",
      direction: "incoming",
      text: "Could you take a look at the opening sequence this week?",
      time: "2026-10-01T10:48:00.000Z",
    }),
    textMessage({
      id: "kabir-002",
      conversationId: "kabir-khan",
      sender: "Rohit Samota",
      direction: "outgoing",
      text: "Sure. Tuesday afternoon is open for me.",
      time: "2026-10-01T11:04:00.000Z",
      status: "read",
    }),
    textMessage({
      id: "kabir-003",
      conversationId: "kabir-khan",
      sender: "Kabir Khan",
      direction: "incoming",
      text: "Let’s lock Tuesday, 4 PM.",
      time: "2026-10-01T11:12:00.000Z",
    }),
  ],
  "ananya-iyer": [
    textMessage({
      id: "ananya-001",
      conversationId: "ananya-iyer",
      sender: "Ananya Iyer",
      direction: "incoming",
      text: "Finished Tomorrow, and Tomorrow, and Tomorrow. You were right.",
      time: "2026-09-30T16:36:00.000Z",
    }),
    textMessage({
      id: "ananya-002",
      conversationId: "ananya-iyer",
      sender: "Rohit Samota",
      direction: "outgoing",
      text: "That last third stays with you. Try Sea of Tranquility next.",
      time: "2026-09-30T16:49:00.000Z",
      status: "read",
    }),
    textMessage({
      id: "ananya-003",
      conversationId: "ananya-iyer",
      sender: "Ananya Iyer",
      direction: "incoming",
      text: "That book is officially next on my list 📚",
      time: "2026-09-30T16:58:00.000Z",
    }),
  ],
  "saved-messages": [
    textMessage({
      id: "saved-001",
      conversationId: "saved-messages",
      sender: "Rohit Samota",
      direction: "outgoing",
      text: "Read: The Creative Act — Rick Rubin",
      time: "2026-09-24T18:20:00.000Z",
      status: "read",
    }),
    textMessage({
      id: "saved-002",
      conversationId: "saved-messages",
      sender: "Rohit Samota",
      direction: "outgoing",
      text: "Prototype idea: quick voice notes that auto-summarise into tasks.",
      time: "2026-09-26T07:44:00.000Z",
      status: "read",
    }),
    textMessage({
      id: "saved-003",
      conversationId: "saved-messages",
      sender: "Rohit Samota",
      direction: "outgoing",
      text: "Flight options for December",
      time: "2026-09-28T09:15:00.000Z",
      status: "read",
    }),
  ],
};

const clone = (value) => JSON.parse(JSON.stringify(value));

export function listConversations({ query = "", archived = false } = {}) {
  const search = query.trim().toLocaleLowerCase();
  const visibleConversations = mockConversations.filter(
    (conversation) => Boolean(conversation.archived) === Boolean(archived),
  );
  const conversations = search
    ? visibleConversations.filter((conversation) => {
        const searchable = [
          conversation.name,
          conversation.lastMessage,
          conversation.about,
          conversation.phone,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase();

        return searchable.includes(search);
      })
    : visibleConversations;

  return clone(
    [...conversations].sort((first, second) => {
      if (first.pinned !== second.pinned) return first.pinned ? -1 : 1;
      return new Date(second.lastMessageAt) - new Date(first.lastMessageAt);
    }),
  );
}

export function findConversation(conversationId) {
  const conversation = mockConversations.find(({ id }) => id === conversationId);
  return conversation ? clone(conversation) : null;
}

export function listMessages(conversationId) {
  if (!Object.hasOwn(mockMessages, conversationId)) return null;
  return clone(mockMessages[conversationId]);
}

const previewForMessage = (message) => {
  if (message.deleted) return "You deleted this message";
  if (message.type === "image") return message.text || "Photo";
  if (message.type === "video") return message.text || "Video";
  if (message.type === "audio") return "Voice message";
  if (message.type === "document") return message.file?.name || "Document";
  return message.text;
};

export function appendMessage(conversationId, input) {
  const conversation = mockConversations.find(({ id }) => id === conversationId);
  if (!conversation || !Object.hasOwn(mockMessages, conversationId)) return null;

  if (input.clientMessageId) {
    const existing = mockMessages[conversationId].find(
      (message) => message.clientMessageId === input.clientMessageId,
    );
    if (existing) return clone(existing);
  }

  const timestamp = new Date().toISOString();
  const message = {
    id: globalThis.crypto?.randomUUID?.() || `message-${Date.now()}`,
    clientMessageId: input.clientMessageId || null,
    conversationId,
    sender: currentUser.name,
    direction: "outgoing",
    type: input.type || "text",
    text: input.text || "",
    time: timestamp,
    status: "sent",
    revision: 0,
    replyTo: input.replyTo || null,
    reactions: [],
    media: input.media || null,
    file: input.file || null,
    duration: input.duration ?? null,
  };

  mockMessages[conversationId].push(message);
  conversation.lastMessageId = message.id;
  conversation.lastMessage = previewForMessage(message);
  conversation.lastMessageAt = timestamp;
  conversation.unread = 0;

  return clone(message);
}

const editableConversationFlags = new Set(["pinned", "archived", "muted"]);

export function updateConversationFlags(conversationId, updates) {
  const conversation = mockConversations.find(
    ({ id }) => String(id) === String(conversationId),
  );
  if (!conversation) return null;

  Object.entries(updates).forEach(([key, value]) => {
    if (editableConversationFlags.has(key) && typeof value === "boolean") {
      conversation[key] = value;
    }
  });
  return clone(conversation);
}

function syncConversationPreview(conversationId) {
  const conversation = mockConversations.find(
    ({ id }) => String(id) === String(conversationId),
  );
  const messages = mockMessages[conversationId];
  if (!conversation || !messages) return null;

  const latest = messages.at(-1);
  conversation.lastMessageId = latest?.id || null;
  conversation.lastMessage = latest ? previewForMessage(latest) : "Start a conversation";
  conversation.lastMessageAt = latest?.time || null;
  return conversation;
}

export function editMockMessage(conversationId, messageId, text) {
  const messages = mockMessages[conversationId];
  if (!messages) return { error: "conversation_not_found" };
  const message = messages.find(({ id }) => String(id) === String(messageId));
  if (!message) return { error: "message_not_found" };
  if (message.direction !== "outgoing") return { error: "message_not_owned" };
  if (message.type !== "text" || message.deleted) return { error: "message_not_editable" };

  message.text = text;
  message.edited = true;
  message.editedAt = new Date().toISOString();
  message.revision = Number(message.revision || 0) + 1;
  syncConversationPreview(conversationId);
  return { message: clone(message), conversation: findConversation(conversationId) };
}

export function deleteMockMessage(conversationId, messageId) {
  const messages = mockMessages[conversationId];
  if (!messages) return { error: "conversation_not_found" };
  const message = messages.find(({ id }) => String(id) === String(messageId));
  if (!message) return { error: "message_not_found" };
  if (message.direction !== "outgoing") return { error: "message_not_owned" };

  if (!message.deleted) {
    message.type = "text";
    message.text = "";
    message.caption = "";
    message.media = null;
    message.file = null;
    message.duration = null;
    message.reactions = [];
    message.replyTo = null;
    message.deleted = true;
    message.deletedAt = new Date().toISOString();
    message.revision = Number(message.revision || 0) + 1;
    syncConversationPreview(conversationId);
  }

  return { message: clone(message), conversation: findConversation(conversationId) };
}
