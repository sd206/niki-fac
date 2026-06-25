export type MemoryType =
  | "preference"
  | "goal"
  | "habit"
  | "fact"
  | "event_summary"
  | "travel_pattern"
  | "financial_pattern";

export type MemorySource = "user_input" | "ai_extracted" | "system_observed";

export interface Memory {
  id: string;
  familyId: string;
  type: MemoryType;
  content: string;
  source: MemorySource;
  createdAt: string;
}

export interface CreateMemoryRequest {
  familyId: string;
  type: MemoryType;
  content: string;
  source?: MemorySource;
}

export interface ListMemoriesQuery {
  familyId: string;
  type?: MemoryType;
}

export type EntityType =
  | "person"
  | "place"
  | "organization"
  | "event"
  | "concept"
  | "document";

export interface Entity {
  id: string;
  familyId: string;
  name: string;
  type: EntityType;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface CreateEntityRequest {
  familyId: string;
  name: string;
  type: EntityType;
  metadata?: Record<string, unknown>;
}

export type RelationshipType =
  | "related_to"
  | "parent_of"
  | "located_in"
  | "owns"
  | "part_of"
  | "scheduled_at"
  | "paid_by"
  | "preferred_by"
  | "associated_with";

export interface Relationship {
  id: string;
  familyId: string;
  fromEntityId: string;
  toEntityId: string;
  fromEntityName: string;
  toEntityName: string;
  type: RelationshipType;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface CreateRelationshipRequest {
  familyId: string;
  fromEntityId: string;
  toEntityId: string;
  type: RelationshipType;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeGraph {
  entities: Entity[];
  relationships: Relationship[];
}

export type MessageRole = "user" | "assistant" | "system";

export interface ConversationMessage {
  role: MessageRole;
  content: string;
  citations?: Citation[];
  createdAt: string;
}

export interface Citation {
  type: "event" | "task" | "expense" | "document" | "memory" | "meal" | "trip";
  id: string;
  title: string;
}

export interface AIConversation {
  id: string;
  familyId: string;
  userId: string;
  title: string;
  messages: ConversationMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatRequest {
  familyId: string;
  query: string;
  conversationId?: string;
}

export interface ChatResponse {
  conversationId: string;
  message: ConversationMessage;
}

export type InsightType =
  | "spending"
  | "task_completion"
  | "schedule"
  | "savings"
  | "general";

export interface Insight {
  type: InsightType;
  title: string;
  detail: string;
  severity: "info" | "warning" | "positive";
}
