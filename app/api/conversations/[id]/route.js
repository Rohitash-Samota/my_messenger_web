import { NextResponse } from "next/server";

import { findConversation, updateConversationFlags } from "@/data/mock-data";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
};

const errorResponse = (status, code, message) =>
  NextResponse.json({ error: { code, message } }, { status, headers: noStoreHeaders });

export async function PATCH(request, { params }) {
  const { id } = await params;
  if (!id) return errorResponse(400, "missing_conversation_id", "A conversation id is required.");
  if (!findConversation(id)) {
    return errorResponse(404, "conversation_not_found", "That conversation does not exist.");
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return errorResponse(400, "invalid_json", "The request body must contain valid JSON.");
  }

  const allowed = ["pinned", "archived", "muted"];
  const entries = Object.entries(payload || {});
  if (
    !entries.length ||
    entries.some(([key, value]) => !allowed.includes(key) || typeof value !== "boolean")
  ) {
    return errorResponse(
      422,
      "invalid_conversation_update",
      "Provide pinned, archived, or muted as boolean values.",
    );
  }

  return NextResponse.json(
    { data: updateConversationFlags(id, Object.fromEntries(entries)) },
    { headers: noStoreHeaders },
  );
}
