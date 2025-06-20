import esbuild from 'esbuild';

await esbuild.build({
	entryPoints: ['src/index.ts'],
	outfile: 'dist/vdom.js',
	bundle: true,
	format: 'iife',
	globalName: 'VDOM',
	sourcemap: true,
	target: 'es2017',
});

await esbuild.build({
	entryPoints: ['src/index.ts'],
	outfile: 'dist/vdom.min.js',
	bundle: true,
	format: 'iife',
	globalName: 'VDOM',
	minify: true,
	sourcemap: false,
	target: 'es2017',
});

console.log('Build complete!');
