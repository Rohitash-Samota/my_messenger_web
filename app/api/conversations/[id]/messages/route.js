import { NextResponse } from "next/server";

import {
  appendMessage,
  currentUser,
  findConversation,
  listMessages,
} from "@/data/mock-data";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
};

const supportedMessageTypes = new Set(["text", "image", "document", "audio"]);

const errorResponse = (status, code, message, details = null) =>
  NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    },
    { status, headers: noStoreHeaders },
  );

const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

function normalisePayload(payload) {
  if (!isObject(payload)) {
    return { error: "The request body must be a JSON object." };
  }

  const type = typeof payload.type === "string" ? payload.type.toLowerCase() : "text";
  if (!supportedMessageTypes.has(type)) {
    return {
      error: `Unsupported message type. Use one of: ${[...supportedMessageTypes].join(", ")}.`,
    };
  }

  const text = typeof payload.text === "string" ? payload.text.trim() : "";
  if (text.length > 5000) {
    return { error: "Message text cannot exceed 5,000 characters." };
  }

  const media = isObject(payload.media) ? payload.media : null;
  const file = isObject(payload.file) ? payload.file : null;
  const duration = Number.isFinite(payload.duration) && payload.duration >= 0 ? payload.duration : null;

  if (type === "text" && !text) {
    return { error: "Message text is required." };
  }

  if (type === "image" && !media?.url) {
    return { error: "Image messages require media.url." };
  }

  if (type === "document" && !file?.name) {
    return { error: "Document messages require file.name." };
  }

  if (type === "audio" && duration === null && !media?.url) {
    return { error: "Audio messages require duration or media.url." };
  }

  let replyTo = null;
  if (payload.replyTo !== undefined && payload.replyTo !== null) {
    if (!isObject(payload.replyTo) || !payload.replyTo.id) {
      return { error: "replyTo must include the referenced message id." };
    }

    replyTo = {
      id: String(payload.replyTo.id),
      sender: String(payload.replyTo.sender || ""),
      text: String(payload.replyTo.text || "").slice(0, 240),
    };
  }

  return {
    value: {
      type,
      text,
      replyTo,
      media,
      file,
      duration,
    },
  };
}

async function resolveConversation(params) {
  const { id } = await params;
  if (!id) return { id: null, conversation: null };
  return { id, conversation: findConversation(id) };
}

export async function GET(_request, { params }) {
  try {
    const { id, conversation } = await resolveConversation(params);

    if (!id) {
      return errorResponse(400, "missing_conversation_id", "A conversation id is required.");
    }

    if (!conversation) {
      return errorResponse(404, "conversation_not_found", "That conversation does not exist.");
    }

    const messages = listMessages(id) || [];

    return NextResponse.json(
      {
        data: messages,
        meta: {
          total: messages.length,
          conversation,
          currentUser,
        },
      },
      { headers: noStoreHeaders },
    );
  } catch {
    return errorResponse(
      500,
      "messages_unavailable",
      "Messages could not be loaded right now.",
    );
  }
}

export async function POST(request, { params }) {
  const { id, conversation } = await resolveConversation(params);

  if (!id) {
    return errorResponse(400, "missing_conversation_id", "A conversation id is required.");
  }

  if (!conversation) {
    return errorResponse(404, "conversation_not_found", "That conversation does not exist.");
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return errorResponse(400, "invalid_json", "The request body must contain valid JSON.");
  }

  const normalised = normalisePayload(payload);
  if (normalised.error) {
    return errorResponse(422, "invalid_message", normalised.error);
  }

  try {
    const message = appendMessage(id, normalised.value);

    if (!message) {
      return errorResponse(404, "conversation_not_found", "That conversation does not exist.");
    }

    return NextResponse.json(
      {
        data: message,
        meta: {
          conversation: findConversation(id),
        },
      },
      { status: 201, headers: noStoreHeaders },
    );
  } catch {
    return errorResponse(500, "message_not_sent", "The message could not be sent right now.");
  }
}
