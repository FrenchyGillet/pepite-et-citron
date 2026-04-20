import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = `${__dirname}/../public/icon.svg`;
const outDir  = `${__dirname}/../public`;

const svg = readFileSync(svgPath, "utf8");

for (const size of [192, 512]) {
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: size } });
  const rendered = resvg.render();
  const png = rendered.asPng();
  const outPath = `${outDir}/icon-${size}x${size}.png`;
  writeFileSync(outPath, png);
  console.log(`✓ ${outPath} (${size}×${size})`);
}
