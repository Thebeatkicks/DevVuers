const API_URL = "http://localhost:4000/api";

export async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`);
  if (!response.ok) throw new Error(`API-fel: ${response.status}`);
  return (await response.json()) as T;
}
