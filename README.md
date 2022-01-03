# vite-plugin-web-extension

A vite plugin to help build cross browser platform, ES module based web extensions.

## Features

- Manifest V2 & V3 Support
- Completely ES module based extensions
  - Including content scripts!
- Vite based html and static asset handling
  - Including content scripts!
- HMR support for all manifest properties
  - Including content scripts!
- HMR support for CSS styles in content scripts
  - Including shadow DOM rendered content!

# Usage

## Quick Start

Build an [example extension](https://github.com/samrum/vite-web-extension) using this plugin:

<details>
  <summary>With npm</summary>

    npx degit https://github.com/samrum/vite-web-extension
    cd vite-web-extension
    npm install
    npm run build
    npm run serve:chrome

</details>
<details>
  <summary>With pnpm</summary>

    pnpm dlx degit https://github.com/samrum/vite-web-extension
    cd vite-web-extension
    pnpm install
    pnpm build
    pnpm serve:chrome

</details>

## Vite Config

- All manifest file names should be relative to the root of the project.

<details>
  <summary>Manifest V2</summary>

    import { defineConfig } from "vite";
    import webExtension from "@samrum/vite-plugin-web-extension";

    export default defineConfig({
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
    });

</details>

<details>
  <summary>Manifest V3</summary>

    import { defineConfig } from "vite";
    import webExtension from "@samrum/vite-plugin-web-extension";

    export default defineConfig({
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
    });

</details>

## Content Script Notes

- For HMR style support within shadow DOMs, use the `addStyleTarget` function to add the shadowRoot of your element as a style target:

  ```
  const { addStyleTarget } = await import("/@vite/client");

  addStyleTarget(shadowRoot);
  ```

- Use the `import.meta.CURRENT_CONTENT_SCRIPT_CSS_URL` constant to get a reference to the generated CSS file within a given content script

## Browser Support

The following requirements must be met by the browser:

- Must support dynamic module imports made by web extension content scripts.
- Must support `import.meta.url`

Some minimum supported browsers:

|          | Manifest V2 | Manifest V3                                                                            |
| -------- | ----------- | -------------------------------------------------------------------------------------- |
| Chromium | 64          | 91                                                                                     |
| Firefox  | 89          | N/A ([In development](https://blog.mozilla.org/addons/2021/05/27/manifest-v3-update/)) |

The plugin will automatically default vite's `build.target` config option to these minimum browser versions.

# What the Plugin Does

The plugin will take the provided manifest, parse rollup input scripts from all supported manifest properties, then output an ES module based web extension.

This includes:

- Generating and using a dynamic import wrapper script in place of original content scripts while moving the original scripts to `web_accessible_resources` so they are accessible by the wrapper script. Needed because content scripts are not able to be loaded as ES modules.
  - This may expose your extension to fingerprinting by other extensions or websites. Manifest V3 supports a [`use_dynamic_url` property](https://developer.chrome.com/docs/extensions/mv3/manifest/web_accessible_resources/#:~:text=access%20the%20resources.-,use_dynamic_url,-If%20true%2C%20only) that will mitigate this. This option is set for manifest V3 generated web accessible resources.
- Modifying Vite's static asset handling to maintain `import.meta.url` usages instead of rewriting to self.location. Needed so content script static asset handling can function correctly.
- Modifying Vite's HMR client to add support for targeting specific elements as style injection points. Needed to support HMR styles in shadow DOM rendered content.

# Development

This project uses [pnpm](https://pnpm.io/) for package management.

## Lint

    pnpm lint

## Tests

    pnpm test

## Build

    pnpm build
