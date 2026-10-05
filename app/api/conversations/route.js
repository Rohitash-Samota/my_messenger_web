import { NextResponse } from "next/server";

import { currentUser, listConversations } from "@/data/mock-data";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
};

export async function GET(request) {
  try {
    const query = request.nextUrl.searchParams.get("q")?.slice(0, 100) || "";
    const archivedValue = request.nextUrl.searchParams.get("archived");
    if (archivedValue !== null && !["true", "false"].includes(archivedValue)) {
      return NextResponse.json(
        {
          error: {
            code: "invalid_archived_filter",
            message: "The archived filter must be true or false.",
          },
        },
        { status: 422, headers: noStoreHeaders },
      );
    }
    const archived = archivedValue === "true";
    const conversations = listConversations({ query, archived });

    return NextResponse.json(
      {
        data: conversations,
        meta: {
          total: conversations.length,
          query: query || null,
          archived,
          currentUser,
        },
      },
      { headers: noStoreHeaders },
    );
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "conversations_unavailable",
          message: "Conversations could not be loaded right now.",
        },
      },
      { status: 500, headers: noStoreHeaders },
    );
  }
}
