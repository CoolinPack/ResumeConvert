const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const site=(process.env.SITE_URL||process.env.VERCEL_PROJECT_PRODUCTION_URL||process.env.VERCEL_URL||'').replace(/\/$/,'');
if(!site){console.warn('SITE_URL/VERCEL_URL not set; sitemap generation skipped. Set SITE_URL in Vercel for production builds.');process.exit(0)}
const base=site.startsWith('http')?site:`https://${site}`;
const urls=['/','/index.html','/create-resume.html','/convert.html','/reviews.html'];
const xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls.map(u=>`<url><loc>${base}${u}</loc></url>`).join('')+'</urlset>\n';
fs.writeFileSync(path.join(root,'sitemap.xml'),xml);
console.log(`Generated sitemap for ${base}`);
