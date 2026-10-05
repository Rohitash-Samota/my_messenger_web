import { NextResponse } from "next/server";

import {
  deleteMockMessage,
  editMockMessage,
  findConversation,
} from "@/data/mock-data";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
};

const errorResponse = (status, code, message) =>
  NextResponse.json({ error: { code, message } }, { status, headers: noStoreHeaders });

const mutationError = (error) => {
  if (error === "conversation_not_found") {
    return errorResponse(404, error, "That conversation does not exist.");
  }
  if (error === "message_not_found") {
    return errorResponse(404, error, "That message does not exist.");
  }
  if (error === "message_not_owned") {
    return errorResponse(403, error, "You can only change messages you sent.");
  }
  return errorResponse(409, error, "That message cannot be changed.");
};

async function resolveIds(params) {
  const { id, messageId } = await params;
  return { id, messageId };
}

export async function PATCH(request, { params }) {
  const { id, messageId } = await resolveIds(params);
  if (!id || !messageId) {
    return errorResponse(400, "missing_identifier", "Conversation and message ids are required.");
  }
  if (!findConversation(id)) return mutationError("conversation_not_found");

  let payload;
  try {
    payload = await request.json();
  } catch {
    return errorResponse(400, "invalid_json", "The request body must contain valid JSON.");
  }

  const text = typeof payload?.text === "string" ? payload.text.trim() : "";
  if (!text || text.length > 1000) {
    return errorResponse(
      422,
      "invalid_message",
      "Edited message text must be between 1 and 1,000 characters.",
    );
  }

  const result = editMockMessage(id, messageId, text);
  if (result.error) return mutationError(result.error);
  return NextResponse.json(
    { data: { message: result.message, conversation: result.conversation } },
    { headers: noStoreHeaders },
  );
}

export async function DELETE(_request, { params }) {
  const { id, messageId } = await resolveIds(params);
  if (!id || !messageId) {
    return errorResponse(400, "missing_identifier", "Conversation and message ids are required.");
  }
  if (!findConversation(id)) return mutationError("conversation_not_found");

  const result = deleteMockMessage(id, messageId);
  if (result.error) return mutationError(result.error);
  return NextResponse.json(
    { data: { message: result.message, conversation: result.conversation } },
    { headers: noStoreHeaders },
  );
}
