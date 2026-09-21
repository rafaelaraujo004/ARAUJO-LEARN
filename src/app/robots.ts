import type { MetadataRoute } from 'next';

const base = (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');

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
