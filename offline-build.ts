import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { Plugin } from 'vite';

export default function offlineBuild(): Plugin {
  let outDir: string, root: string;
  function files(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
  }
  return {
    name: 'pastq-offline-shell', apply: 'build',
    configResolved(config) { root = config.root; outDir = path.resolve(root, config.build.outDir); },
    writeBundle() {
      // Only public, build-owned static assets. API responses and account records are never cached here.
      const urls = files(outDir).filter(file => /\.(?:js|css|woff2?|png|jpe?g|webp|svg|webmanifest)$/.test(file) && !file.endsWith('study-reminders-sw.js'))
        .map(file => '/' + path.relative(outDir, file).split(path.sep).join('/')).concat('/index.html');
      const worker = fs.readFileSync(path.join(root, 'public/study-reminders-sw.js'), 'utf8');
      const digest = createHash('sha256').update(worker);
      for(const url of urls)digest.update(url).update(fs.readFileSync(path.join(outDir,url.slice(1))));
      const version=digest.digest('hex').slice(0,16);
      fs.writeFileSync(path.join(outDir, 'study-reminders-sw.js'), `const SHELL_VERSION=${JSON.stringify(version)};\nconst SHELL_FILES=${JSON.stringify(urls)};\n` + worker);
    },
  };
}
