import { requestJson } from "@/lib/api-client";
import { guestLibraryRequest } from "@/lib/guest-library";
import { isGuestMode } from "@/lib/library-mode";

export async function libraryRequest<T>(
  input: string,
  init?: RequestInit,
  parse?: (value: unknown) => T,
): Promise<T> {
  if (!isGuestMode()) return requestJson(input, init, parse);
  const value = await guestLibraryRequest(input, init);
  return parse ? parse(value) : (value as T);
}
