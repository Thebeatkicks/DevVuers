const API_URL = "http://localhost:4000/api";

export async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`);
  if (!response.ok) throw new Error(`API-fel: ${response.status}`);
  return (await response.json()) as T;
}

export async function post<TResponse, TBody = unknown>(
  path: string, 
  body: TBody
): Promise<TResponse> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`API-fel: ${response.status}`);
  return (await response.json()) as TResponse;
};