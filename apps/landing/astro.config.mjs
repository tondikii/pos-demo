import { defineConfig } from 'astro/config'
import sitemap from 'astro-sitemap'
import robotsTxt from 'astro-robots-txt'

// https://astro.build/config
export default defineConfig({
  site: 'https://larispos.id',
  integrations: [
    // Generate sitemap-index.xml + sitemap-0.xml saat build (static-only).
    sitemap({
      // Halaman utama jarang berubah kontennya; prioritaskan di sitemap.
      changefreq: 'weekly',
      priority: 1.0,
    }),
    // Generate robots.txt saat build; Sitemap: mengarah ke sitemap-index.xml.
    robotsTxt({
      policy: [{ userAgent: '*', allow: '/' }],
      host: true,
    }),
  ],
})
