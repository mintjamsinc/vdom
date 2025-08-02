import esbuild from 'esbuild';

await esbuild.build({
	entryPoints: ['src/index.ts'],
	outfile: 'dist/vdom.js',
	bundle: true,
	format: 'esm',
	sourcemap: true,
	target: 'es2017',
});

await esbuild.build({
	entryPoints: ['src/index.ts'],
	outfile: 'dist/vdom.min.js',
	bundle: true,
	format: 'esm',
	minify: true,
	sourcemap: false,
	target: 'es2017',
});

console.log('Build complete!');
