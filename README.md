# rollup-plugin-web-extension

A rollup plugin to help build cross browser platform, ES module based web extensions.

## Browser Support

In order to fully support ES module based extensions, the following requirements must be met by the browser:

- Must support dynamic module imports made by web extension content scripts.
- If using Manifest V3, must support ES modules in service workers.

Some minimum supported browsers:

|          | Manifest V2   | Manifest V3 |
| -------- | ------------- | ----------- |
| Chromium | 63 (Untested) | 91          |
| Firefox  | 89            | N/A         |

# Usage

- All manifest file paths (including paths in manifest HTML files) should be relative to the root of the project.
  - If your rollup config supports it, you can define paths using a non-js file extension. (eg `.ts` for TypeScript).

## Config Examples

<details>
  <summary>Manifest V2</summary>

    import webExtension from "@samrum/rollup-plugin-web-extension";
    import pkg from "./package.json";

    export default {
      output: {
        dir: 'dist',
      },
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
    };

</details>

<details>
  <summary>Manifest V3</summary>

    import webExtension from "@samrum/rollup-plugin-web-extension";
    import pkg from "./package.json";

    export default {
      output: {
        dir: 'dist',
      },
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
      ],
    };

</details>

# What the Plugin Does

The plugin will take the provided manifest, parse rollup input scripts from all supported manifest properties as well as within any background, option, popup, or web accessible html files, and then output an ES module based web extension.

This includes:

- Parsing and adding the `type="module"` attribute to input scripts within manifest background, options, popup, and web accessible HTML files.
- If using background scripts, generating and using a background html file to load scripts as ES modules.
- If using background service workers, adding the `type: "module"` property to the `service_worker` manifest property
- Generating and using a dynamic import wrapper script in place of original content scripts while moving the original scripts to `web_accessible_resources` so they are accessible by the wrapper script. This is necessary because content scripts are not able to be loaded as modules.
  - NOTE: This may expose your extension to fingerprinting by other extensions or websites. Manifest V3 will support a [`use_dynamic_url` property](https://developer.chrome.com/docs/extensions/mv3/manifest/web_accessible_resources/#:~:text=access%20the%20resources.-,use_dynamic_url,-If%20true%2C%20only) that will mitigate this, but as of this writing is not implemented yet.

# Development

This project uses [pnpm](https://pnpm.io/) for package management.

## Lint

    pnpm lint

## Tests

    pnpm test

## Build

    pnpm build
