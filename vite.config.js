import { defineConfig } from "vite";

// The sprites (src/art.js) and sounds (src/sounds.js) are kept inline as data URIs, so the single-file
// Claude artifact (build.py) can carry them. For the website, this turns each one into its own file,
// which the browser can cache and fetch on its own.
function inlineAssetsToFiles() {
  const pick = (ctx, code, re, nameOf, ext) => {
    let out = "", last = 0, m;
    re.lastIndex = 0;
    while ((m = re.exec(code))) {
      const name = nameOf(code, m), data = m[m.length - 1];
      const ref = ctx.emitFile({ type: "asset", name: name + "." + ext, source: Buffer.from(data, "base64") });
      out += code.slice(last, m.index) + m[0].slice(0, m[0].indexOf('"data:')) + "import.meta.ROLLUP_FILE_URL_" + ref;
      last = m.index + m[0].length;
    }
    return out + code.slice(last);
  };
  return {
    name: "inline-assets-to-files",
    apply: "build",
    transform(code, id) {
      if (id.endsWith("/src/art.js")) {
        // name each image after the sprite it belongs to (the nearest key opening an object before it)
        const keyBefore = (text, m) => {
          const head = text.slice(0, m.index), all = [...head.matchAll(/"([\w.-]+)":\s*\{/g)];
          return all.length ? all[all.length - 1][1] : "sprite";
        };
        return { code: pick(this, code, /"src":\s*"data:image\/png;base64,([^"]+)"/g, keyBefore, "png"), map: null };
      }
      if (id.endsWith("/src/sounds.js")) {
        return { code: pick(this, code, /"([\w-]+)":\s*"data:audio\/mpeg;base64,([^"]+)"/g, (t, m) => m[1], "mp3"), map: null };
      }
      return null;
    },
  };
}

export default defineConfig({
  // relative paths, so the site works at https://<user>.github.io/cv-please/ or on its own domain
  base: "./",
  plugins: [inlineAssetsToFiles()],
  build: {
    outDir: "dist",
    assetsDir: "assets",
    // the sprites are small pixel art: keep every one as its own file rather than inlining it again
    assetsInlineLimit: 0,
  },
});
