import { ensureDir, readFile, writeFile } from "fs-extra";
import path from "path";
import { ManifestParserConfig } from "../manifestParser/manifestParser";
import {
  getContentScriptLoaderFile,
  getServiceWorkerLoaderFile,
} from "./loader";
import { getOutputFileName } from "./manifest";
import { getVirtualModule } from "./virtualModule";

export function getHmrServerOrigin(
  config: ManifestParserConfig,
  devServerPort: number
): string {
  if (typeof config.viteConfig.server.hmr! === "boolean") {
    throw new Error("Vite HMR is misconfigured");
  }

  return `http://${config.viteConfig.server.hmr!.host}:${devServerPort}`;
}

export async function writeManifestHtmlFiles(
  htmlFileNames: string[],
  hmrServerOrigin: string,
  outDir: string
) {
  for (const fileName of htmlFileNames) {
    let content =
      getVirtualModule(fileName) ??
      (await readFile(fileName, {
        encoding: "utf-8",
      }));

    // update root paths
    content = content.replace('src="/', `src="${hmrServerOrigin}/`);

    // update relative paths
    const inputFileDir = path.dirname(fileName);
    content = content.replace(
      'src="./',
      `src="${hmrServerOrigin}/${inputFileDir ? `${inputFileDir}/` : ""}`
    );

    const outFile = `${outDir}/${fileName}`;

    const outFileDir = path.dirname(outFile);

    await ensureDir(outFileDir);

    await writeFile(outFile, content);
  }
}

export async function writeManifestContentScriptFiles(
  manifest: chrome.runtime.Manifest,
  hmrServerOrigin: string,
  outDir: string
) {
  if (!manifest.content_scripts) {
    return;
  }

  for (const [
    contentScriptIndex,
    script,
  ] of manifest.content_scripts.entries()) {
    if (!script.js) {
      continue;
    }

    for (const [scriptJsIndex, fileName] of script.js.entries()) {
      const outputFileName = getOutputFileName(fileName);

      const scriptLoaderFile = getContentScriptLoaderFile(
        outputFileName,
        `${hmrServerOrigin}/${fileName}`
      );

      manifest.content_scripts[contentScriptIndex].js![scriptJsIndex] =
        scriptLoaderFile.fileName;

      const outFile = `${outDir}/${scriptLoaderFile.fileName}`;

      const outFileDir = path.dirname(outFile);

      await ensureDir(outFileDir);

      await writeFile(outFile, scriptLoaderFile.source);
    }
  }
}

export async function writeManifestServiceWorkerFiles(
  manifest: chrome.runtime.ManifestV3,
  hmrServerOrigin: string,
  outDir: string
) {
  if (!manifest.background?.service_worker) {
    return;
  }

  const fileName = manifest.background?.service_worker;

  const serviceWorkerLoader = getServiceWorkerLoaderFile(
    `${hmrServerOrigin}/${fileName}`
  );

  manifest.background.service_worker = serviceWorkerLoader.fileName;

  const outFile = `${outDir}/${serviceWorkerLoader.fileName}`;

  const outFileDir = path.dirname(outFile);

  await ensureDir(outFileDir);

  await writeFile(outFile, serviceWorkerLoader.source);
}

export function updateContentSecurityPolicyForHmr(
  contentSecurityPolicy: string | undefined,
  hmrServerOrigin: string
): string {
  const cspHmrScriptSrc = `script-src ${hmrServerOrigin}; object-src 'self'`;

  if (!contentSecurityPolicy) {
    return cspHmrScriptSrc;
  }

  if (contentSecurityPolicy.includes("script-src")) {
    return contentSecurityPolicy.replace(`script-src`, cspHmrScriptSrc);
  }

  return (contentSecurityPolicy += `; ${cspHmrScriptSrc}`);
}
