import * as esbuild from 'esbuild';

const dev = process.argv.includes('--dev');

const config = {
  entryPoints: ['src/index.ts', 'src/styles.css'],
  bundle: true,
  outdir: 'dist',
  minify: !dev,
  sourcemap: dev,
  target: 'es2019',
  logLevel: 'info',
  banner: dev
    ? { js: "new EventSource('http://localhost:3000/esbuild').addEventListener('change', () => location.reload());" }
    : {},
};

if (dev) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  await ctx.serve({ servedir: 'dist', port: 3000, cors: { origin: '*' } });
  for (const e of config.entryPoints) {
    console.log('dev → http://localhost:3000/' + e.split('/').pop().replace(/\.ts$/, '.js'));
  }
} else {
  await esbuild.build(config);
}