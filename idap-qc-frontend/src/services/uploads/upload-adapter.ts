import { apiRequest } from "@/services/api/http-client";

export interface UploadedImage {
  id: string;
  storagePath: string;
  originalFilename: string;
}

export async function uploadIssueImages(
  issueId: string,
  files: File[],
  onProgress?: (completed: number, total: number) => void,
) {
  const uploaded: UploadedImage[] = [];
  for (const [index, file] of files.entries()) {
    const body = new FormData();
    body.append("image", file);
    body.append("display_order", String(index));
    uploaded.push(await apiRequest<UploadedImage>(`/issues/${issueId}/images`, { method: "POST", body }));
    onProgress?.(uploaded.length, files.length);
  }
  return uploaded;
}
