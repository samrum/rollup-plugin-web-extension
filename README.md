# rollup-plugin-web-extension

A rollup plugin to help build cross browser platform, ES module based web extensions.

## Browser Support

In order to fully support ES module based extensions, the following requirements must be met by the browser:

- Must support dynamic module imports made by web extension content scripts.
- Must support ES modules in service workers. (Manifest V3)

Some minimum supported browsers that meet these requirements are:

- Firefox 89 (Manifest V2)
- Chromium 91 (Manifest V2 & Manifest V3)

# Usage

- All manifest file paths (including paths in manifest HTML files) should be relative to the root of the project.
  - If your rollup config supports it, you can define paths using a non-js file extension. (eg `.ts` for TypeScript).

## Manifest V2

In your rollup config:

    import webExtension from "@samrum/rollup-plugin-web-extension";
    import pkg from "./package.json";

    ...

      plugins: [
        webExtension({
          manifest: {
            name: pkg.name,
            description: pkg.description,
            version: pkg.version,
            manifest_version: 2,
            background: {
              scripts: ["src/background/script.js"],
            },
          },
        }),
      ],

    ...

## Manifest V3

In your rollup config:

    import webExtension from "@samrum/rollup-plugin-web-extension";
    import pkg from "./package.json";

    ...

      plugins: [
        webExtension({
          manifest: {
            name: pkg.name,
            description: pkg.description,
            version: pkg.version,
            manifest_version: 3,
            background: {
              service_worker: "src/background/serviceWorker.js",
            },
          },
        }),
      ]

    ...

# What the Plugin Does

The plugin will take the provided manifest, parse rollup input scripts from all of the manifest properties as well as within any background, option, or popup html files, and then output a ES module based web extension.

This includes:

- Parsing and adding the `type="module"` attribute to input scripts within manifest HTML files like background, options, and popup.
- If using background scripts, generating and using a background html file to load the scripts as ES modules.
- For background service workers, adding the `type: "module"` property to the `service_worker` manifest property
- Generating and using a dynamic import wrapper script in place of original content scripts while moving the original scripts to `web_accessible_resources` so they are loadable by the wrapper script. This is necessary because content scripts do not support static ES module loading.
  - NOTE: This can expose your extension to fingerprinting. Manifest V3, will support a `use_dynamic_url` [property](https://developer.chrome.com/docs/extensions/mv3/manifest/web_accessible_resources/#:~:text=access%20the%20resources.-,use_dynamic_url,-If%20true%2C%20only) that will mitigate this, but isn't available yet.

# Development

This project uses [pnpm](https://pnpm.io/) for package management.

## Lint

    pnpm lint

## Tests

    pnpm test

## Build

    pnpm build
