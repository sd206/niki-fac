export type DocumentCategory =
  | "general"
  | "medical"
  | "insurance"
  | "tax"
  | "receipt"
  | "travel"
  | "education"
  | "property"
  | "other";

export type DocumentPermission = "family" | "parents" | "private" | "custom";

export type OcrStatus = "pending" | "processing" | "done" | "failed" | "not_applicable";

export interface Document {
  id: string;
  familyId: string;
  driveFileId: string | null;
  folderId: string | null;
  ownerId: string;
  name: string;
  path: string;
  mimeType: string | null;
  category: DocumentCategory;
  tags: string[] | null;
  permissions: DocumentPermission;
  ocrStatus: OcrStatus;
  ocrText: string | null;
  sizeBytes: string | null;
  createdAt: string;
}

export interface CreateDocumentRequest {
  familyId: string;
  name: string;
  path: string;
  mimeType?: string;
  category?: DocumentCategory;
  tags?: string[];
  permissions?: DocumentPermission;
  driveFileId?: string;
  folderId?: string;
  sizeBytes?: string;
}

export interface UpdateDocumentRequest {
  name?: string;
  category?: DocumentCategory;
  tags?: string[] | null;
  permissions?: DocumentPermission;
  ocrStatus?: OcrStatus;
  ocrText?: string | null;
}

export interface ListDocumentsQuery {
  familyId: string;
  category?: DocumentCategory;
  folderId?: string;
  search?: string;
}
