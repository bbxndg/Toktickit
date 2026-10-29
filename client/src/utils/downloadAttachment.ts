const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
export async function downloadAttachment(id: number, filename: string, token: string | null): Promise<void> {
  if (!token) throw new Error('Please sign in again before downloading.');
  const response = await fetch(`${API_BASE}/api/attachments/${id}/download`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Unable to download attachment (${response.status}).`);
  const url = URL.createObjectURL(await response.blob());
  try {
    const link = document.createElement('a'); link.href = url; link.download = filename;
    document.body.appendChild(link); link.click(); link.remove();
  } finally { URL.revokeObjectURL(url); }
}
