export const json = (data: unknown, status = 200) => Response.json(data, { status });

export const error = (code: string, status: number, extra: Record<string, unknown> = {}) =>
  Response.json({ error: code, ...extra }, { status });

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}
