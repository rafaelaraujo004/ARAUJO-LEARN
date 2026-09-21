/**
 * Endereço público do site, a partir de APP_URL.
 *
 * Um APP_URL inválido (vazio, "https://" quando a referência a um domínio ainda
 * não existe, sem protocolo) NUNCA pode derrubar o build ou o servidor: cai no
 * endereço local e o restante da plataforma segue funcionando.
 */
const FALLBACK = 'http://localhost:3000';

export function siteUrl(raw: string | undefined = process.env.APP_URL): URL {
  const value = (raw ?? '').trim();
  if (!value) return new URL(FALLBACK);

  // Só assume https:// quando NÃO há protocolo (evita transformar "https://" em "https://https://").
  const candidates = value.includes('://') ? [value] : [`https://${value}`];
  for (const candidate of candidates) {
    try {
      const url = new URL(candidate);
      if (url.hostname) return url;
    } catch {
      // tenta a próxima forma
    }
  }
  return new URL(FALLBACK);
}

/** Origem sem barra final: "https://exemplo.com". */
export function siteOrigin(raw?: string): string {
  return siteUrl(raw).origin;
}
