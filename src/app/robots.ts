import type { MetadataRoute } from 'next';
import { siteOrigin } from '@/lib/site-url';

const base = siteOrigin();

/** Só a área pública é indexada; painel, aluno, API e aulas ficam de fora. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/cursos', '/tutor', '/validar'],
      disallow: ['/admin', '/painel', '/meus-cursos', '/conta', '/aula', '/atividade', '/api'],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
