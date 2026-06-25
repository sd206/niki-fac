import { getDb, schema } from "@niki/db";
import type {
  AIConversation,
  ChatRequest,
  ConversationMessage,
  CreateMemoryRequest,
  ListMemoriesQuery,
  Memory,
} from "@niki/shared-types";
import { and, asc, desc, eq } from "drizzle-orm";
import { getProvider } from "./providers/index.js";
import { buildRagContext } from "./rag.js";

export async function resolveUserId(firebaseUid: string): Promise<string | null> {
  const db = getDb();
  const rows = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.firebaseUid, firebaseUid))
    .limit(1);
  return rows[0]?.id ?? null;
}

export async function isFamilyMember(familyId: string, userId: string): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select({ userId: schema.familyMembers.userId })
    .from(schema.familyMembers)
    .where(
      and(
        eq(schema.familyMembers.familyId, familyId),
        eq(schema.familyMembers.userId, userId),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

// ---- Memories ----

export async function listMemories(query: ListMemoriesQuery): Promise<Memory[]> {
  const db = getDb();
  const conditions = [eq(schema.memories.familyId, query.familyId)];
  if (query.type) conditions.push(eq(schema.memories.type, query.type));

  const rows = await db
    .select()
    .from(schema.memories)
    .where(and(...conditions))
    .orderBy(desc(schema.memories.createdAt));

  return rows.map(rowToMemory);
}

export async function createMemory(input: CreateMemoryRequest): Promise<Memory> {
  const db = getDb();
  const inserted = await db
    .insert(schema.memories)
    .values({
      familyId: input.familyId,
      type: input.type,
      content: input.content,
      source: input.source ?? "user_input",
    })
    .returning();
  return rowToMemory(inserted[0]!);
}

export async function deleteMemory(memoryId: string): Promise<void> {
  const db = getDb();
  await db.delete(schema.memories).where(eq(schema.memories.id, memoryId));
}

// ---- Conversations ----

export async function getConversation(
  conversationId: string,
  familyId: string,
): Promise<AIConversation | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.aiConversations)
    .where(
      and(
        eq(schema.aiConversations.id, conversationId),
        eq(schema.aiConversations.familyId, familyId),
      ),
    )
    .limit(1);
  return rows[0] ? rowToConversation(rows[0]) : null;
}

export async function listConversations(familyId: string, userId: string): Promise<AIConversation[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.aiConversations)
    .where(
      and(
        eq(schema.aiConversations.familyId, familyId),
        eq(schema.aiConversations.userId, userId),
      ),
    )
    .orderBy(desc(schema.aiConversations.updatedAt))
    .limit(20);

  return rows.map(rowToConversation);
}

export async function createConversation(familyId: string, userId: string, title?: string): Promise<AIConversation> {
  const db = getDb();
  const inserted = await db
    .insert(schema.aiConversations)
    .values({
      familyId,
      userId,
      title: title ?? "New Conversation",
    })
    .returning();
  return rowToConversation(inserted[0]!);
}

export async function appendMessage(
  conversationId: string,
  message: ConversationMessage,
): Promise<void> {
  const db = getDb();
  const conv = await db
    .select()
    .from(schema.aiConversations)
    .where(eq(schema.aiConversations.id, conversationId))
    .limit(1);

  if (!conv[0]) return;
  const existingMessages = (conv[0].messages as ConversationMessage[]) ?? [];
  const updatedMessages = [...existingMessages, message];

  await db
    .update(schema.aiConversations)
    .set({
      messages: updatedMessages,
      updatedAt: new Date(),
    })
    .where(eq(schema.aiConversations.id, conversationId));
}

// ---- Chat with RAG ----

const SYSTEM_PROMPT = `You are Niki, an AI assistant for families. You help with scheduling, tasks, finances, meals, travel, documents, and family organization.

You have access to the family's data through a RAG (Retrieval-Augmented Generation) context. Use this context to answer questions accurately and cite specific data points.

Guidelines:
- Be concise and helpful
- Reference specific events, tasks, expenses, or documents from the context
- If the family hasn't set up data in an area, mention it
- Suggest actions when relevant (e.g., "You have 3 overdue tasks, want to tackle them?")
- For financial questions, reference specific budgets and expenses
- For scheduling questions, reference specific events with dates`;

export async function chat(
  input: ChatRequest,
  userId: string,
): Promise<{ conversationId: string; message: ConversationMessage }> {
  // Get or create conversation
  let conversationId = input.conversationId;
  if (!conversationId) {
    const conv = await createConversation(input.familyId, userId, input.query.slice(0, 50));
    conversationId = conv.id;
  }

  // Build RAG context from family data
  const { context, citations } = await buildRagContext(input.familyId, input.query);

  // Get conversation history
  const conversation = await getConversation(conversationId, input.familyId);
  const history = (conversation?.messages ?? [])
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  // Get AI provider and generate response
  const provider = await getProvider();
  const responseText = await provider.generateResponse(
    SYSTEM_PROMPT,
    input.query,
    context,
    history.slice(-10), // Last 10 messages for context window
  );

  const now = new Date().toISOString();

  // Save user message
  const userMessage: ConversationMessage = {
    role: "user",
    content: input.query,
    createdAt: now,
  };
  await appendMessage(conversationId, userMessage);

  // Save assistant message
  const assistantMessage: ConversationMessage = {
    role: "assistant",
    content: responseText,
    citations,
    createdAt: new Date().toISOString(),
  };
  await appendMessage(conversationId, assistantMessage);

  return { conversationId, message: assistantMessage };
}

// ---- Mappers ----

function rowToMemory(row: typeof schema.memories.$inferSelect): Memory {
  return {
    id: row.id,
    familyId: row.familyId,
    type: row.type as Memory["type"],
    content: row.content,
    source: row.source as Memory["source"],
    createdAt: row.createdAt.toISOString(),
  };
}

function rowToConversation(row: typeof schema.aiConversations.$inferSelect): AIConversation {
  return {
    id: row.id,
    familyId: row.familyId,
    userId: row.userId,
    title: row.title,
    messages: (row.messages as ConversationMessage[]) ?? [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
