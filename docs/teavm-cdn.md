# TeaVM CDN Assets

H5P.JavaQuestion loads the TeaVM browser compiler assets from a versioned static
host. The content type no longer ships a local `teavm/` fallback directory.

The default asset base is:

```yaml
teavmAssetBaseUrl: https://cdn.jsdelivr.net/gh/asbl/teaVM-h5p@1.0.0/
```

## GitHub and jsDelivr

1. Create a public GitHub repository for the runtime assets, for example
   `ORG/h5p-java-question-assets`.
2. Copy the TeaVM runtime asset files into that repository. They can either live
   inside a `teavm/` directory:

   ```text
   teavm/
     worker.js
     frame.js
     run-frame.html
     compiler.wasm-runtime.js
     compiler.wasm
     compile-classlib-teavm.bin
     runtime-classlib-teavm.bin
   ```

3. Commit the files and create a version tag, for example `v1.0.0`.
4. Use this base URL in the JavaQuestion advanced YAML field:

   ```yaml
   teavmAssetBaseUrl: https://cdn.jsdelivr.net/gh/ORG/h5p-java-question-assets@v1.0.0/teavm/
   ```

   If the files are stored directly in the repository root, omit `/teavm/`:

   ```yaml
   teavmAssetBaseUrl: https://cdn.jsdelivr.net/gh/ORG/h5p-java-question-assets@v1.0.0/
   ```

   Example for `asbl/teaVM-h5p`:

   ```yaml
   teavmAssetBaseUrl: https://cdn.jsdelivr.net/gh/asbl/teaVM-h5p@1.0.0/
   ```

The `worker.js`, `frame.js`, and `run-frame.html` files are H5P-specific and
must stay in sync with this library. Do not point production content directly at
the official TeaVM playground folder unless you deliberately accept that
external version coupling.

jsDelivr serves HTML files from GitHub as plain text in some cases. For external
TeaVM asset bases, H5P.JavaQuestion therefore creates a small same-origin blob
frame that imports `frame.js` from the CDN instead of relying on the CDN-hosted
`run-frame.html` document.

## Updating Assets

Use a new immutable tag for every asset update:

```text
v1.0.0
v1.0.1
v1.1.0
```

Then update `DEFAULT_TEAVM_ASSET_BASE_URL` in
`src/scripts/runtime/teavm-assets.js` or override `teavmAssetBaseUrl` in the
content type settings. Avoid mutable branches such as `main` for production
content, because jsDelivr and browsers cache aggressively.

If you need to clear jsDelivr's cache while testing, open:

```text
https://purge.jsdelivr.net/gh/ORG/h5p-java-question-assets@v1.0.0/teavm/worker.js
```

and repeat that for the changed files. For production, prefer publishing a new
tag instead.
