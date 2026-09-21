/**
 * Roda uma vez quando o servidor sobe.
 * Serve para falhar alto — no log do Railway — em configuração perigosa.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { warnIfLocalStorage } = await import('@/server/storage');
  warnIfLocalStorage();

  if (process.env.NODE_ENV === 'production') {
    const secret = process.env.AUTH_SECRET ?? '';
    if (secret.length < 32) {
      console.error(
        '[config] AUTH_SECRET ausente ou curto demais (mínimo 32 caracteres). ' +
          'Gere com: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"',
      );
    }
    if (!process.env.APP_URL) {
      console.warn('[config] APP_URL não definida: links de e-mail e validação usarão localhost.');
    }
  }
}
