import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Política de segurança de conteúdo.
 *
 * - Nada de scripts, iframes ou formulários que apontem para fora do site.
 * - `img-src`/`media-src` aceitam https: porque capas e vídeos vêm do bucket por
 *   URL assinada (o domínio do Railway/R2 muda por ambiente).
 * - `connect-src` aceita https: pelo mesmo motivo: o upload vai direto do
 *   navegador para o bucket, sem passar pelo servidor da aplicação.
 * - `'unsafe-inline'` em scripts/estilos é exigência do Next sem nonce; as demais
 *   diretivas continuam limitando o estrago de um eventual XSS.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' https:${isDev ? ' http: ws: wss:' : ''}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Capas e avatares vêm do bucket (URLs assinadas) ou de /uploads no driver local.
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    // Uploads grandes nunca passam pelo backend (vão direto ao bucket),
    // então o limite de body serve só para formulários e metadados.
    serverActions: { bodySizeLimit: '2mb' },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          ...(isDev
            ? []
            : [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=31536000; includeSubDomains',
                },
              ]),
        ],
      },
    ];
  },
};

export default nextConfig;
