export type UpdateCheck = "unsupported" | "none" | "found";

export async function checkForUpdates(): Promise<UpdateCheck> {
  if (!("serviceWorker" in navigator)) return "unsupported";
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return "unsupported";
  await reg.update();
  return reg.installing || reg.waiting ? "found" : "none";
}
