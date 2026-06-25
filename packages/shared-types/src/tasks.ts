export type TaskType = "personal" | "family" | "chore";

export type TaskStatus = "open" | "in_progress" | "completed" | "cancelled";

export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string;
  familyId: string;
  title: string;
  description: string | null;
  assigneeId: string | null;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  dueAt: string | null;
  recurrenceRule: string | null;
  points: number;
  createdAt: string;
}

export interface CreateTaskRequest {
  familyId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  type?: TaskType;
  priority?: TaskPriority;
  dueAt?: string;
  points?: number;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string | null;
  assigneeId?: string | null;
  type?: TaskType;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueAt?: string | null;
  points?: number;
}

export interface ListTasksQuery {
  familyId: string;
  status?: TaskStatus;
  assigneeId?: string;
}
