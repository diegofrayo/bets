import * as esbuild from "esbuild";
import esbuildPluginTsc from "esbuild-plugin-tsc";

esbuild.build({
	entryPoints: ["src/scripts/bets/index.ts"],
	outfile: "../diegofrayo-chrome-extension/src/lib/bets.js",
	bundle: true,
	target: "esnext",
	format: "esm",
	minify: false,
	sourcemap: true,
	plugins: [
		esbuildPluginTsc({
			force: true,
		}),
	],
});
