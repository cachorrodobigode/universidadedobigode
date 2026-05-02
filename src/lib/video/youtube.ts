// Extrai o video ID de uma URL do YouTube em vários formatos:
// - https://www.youtube.com/watch?v=XXXXXXXXXXX
// - https://youtu.be/XXXXXXXXXXX
// - https://www.youtube.com/embed/XXXXXXXXXXX
// - https://www.youtube.com/shorts/XXXXXXXXXXX
// - XXXXXXXXXXX (já é o id, 11 caracteres)
export function extrairYoutubeId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // já é o id puro
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    if (url.hostname === "youtu.be") {
      const id = url.pathname.replace(/^\//, "").split("/")[0];
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (url.hostname.endsWith("youtube.com") || url.hostname.endsWith("youtube-nocookie.com")) {
      const v = url.searchParams.get("v");
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
      const m = url.pathname.match(/\/(embed|shorts|v|live)\/([a-zA-Z0-9_-]{11})/);
      if (m) return m[2];
    }
  } catch {
    // não é URL válida — segue o fluxo
  }
  return null;
}

export function youtubeEmbedUrl(id: string): string {
  // controles, sem related, sem keyboard
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    iv_load_policy: "3",
    disablekb: "1",
    playsinline: "1",
  });
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}
