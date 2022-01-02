import { copy, emptyDir, ensureDir, readFile, writeFile } from "fs-extra";
import path from "path";
import { ResolvedConfig } from "vite";
import { getContentScriptLoaderFile } from "../utils/loader";
import { getOutputFileName } from "../utils/manifest";
import { getVirtualModule } from "../utils/virtualModule";

export default abstract class DevServeBuilder {
  protected hmrServerOrigin: string = "";
  protected outDir: string;

  constructor(private viteConfig: ResolvedConfig) {
    this.outDir = this.viteConfig.build.outDir;
  }

  protected abstract writeBuildFiles(
    manifest: chrome.runtime.Manifest,
    manifestHtmlFiles: string[]
  ): Promise<void>;

  protected abstract updateContentSecurityPolicyForHmr(
    manifest: chrome.runtime.Manifest
  ): chrome.runtime.Manifest;

  async writeBuild({
    devServerPort,
    manifest,
    manifestHtmlFiles,
  }: {
    devServerPort: number;
    manifest: chrome.runtime.Manifest;
    manifestHtmlFiles: string[];
  }) {
    this.hmrServerOrigin = this.getHmrServerOrigin(devServerPort);

    await emptyDir(this.outDir);
    copy("public", this.outDir);

    await this.writeBuildFiles(manifest, manifestHtmlFiles);

    this.updateContentSecurityPolicyForHmr(manifest);

    await writeFile(
      `${this.outDir}/manifest.json`,
      JSON.stringify(manifest, null, 2)
    );
  }

  protected getContentSecurityPolicyWithHmrSupport(
    contentSecurityPolicy: string | undefined
  ): string {
    const cspHmrScriptSrc = `script-src ${this.hmrServerOrigin}; object-src 'self'`;

    if (!contentSecurityPolicy) {
      return cspHmrScriptSrc;
    }

    if (contentSecurityPolicy.includes("script-src")) {
      return contentSecurityPolicy.replace(`script-src`, cspHmrScriptSrc);
    }

    return (contentSecurityPolicy += `; ${cspHmrScriptSrc}`);
  }

  protected async writeManifestHtmlFiles(htmlFileNames: string[]) {
    for (const fileName of htmlFileNames) {
      let content =
        getVirtualModule(fileName) ??
        (await readFile(fileName, {
          encoding: "utf-8",
        }));

      // update root paths
      content = content.replace('src="/', `src="${this.hmrServerOrigin}/`);

      // update relative paths
      const inputFileDir = path.dirname(fileName);
      content = content.replace(
        'src="./',
        `src="${this.hmrServerOrigin}/${inputFileDir ? `${inputFileDir}/` : ""}`
      );

      const outFile = `${this.outDir}/${fileName}`;

      const outFileDir = path.dirname(outFile);

      await ensureDir(outFileDir);

      await writeFile(outFile, content);
    }
  }

  protected async writeManifestContentScriptFiles(
    manifest: chrome.runtime.Manifest
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
          `${this.hmrServerOrigin}/${fileName}`
        );

        manifest.content_scripts[contentScriptIndex].js![scriptJsIndex] =
          scriptLoaderFile.fileName;

        const outFile = `${this.outDir}/${scriptLoaderFile.fileName}`;

        const outFileDir = path.dirname(outFile);

        await ensureDir(outFileDir);

        await writeFile(outFile, scriptLoaderFile.source);
      }
    }
  }

  private getHmrServerOrigin(devServerPort: number): string {
    if (typeof this.viteConfig.server.hmr! === "boolean") {
      throw new Error("Vite HMR is misconfigured");
    }

    return `http://${this.viteConfig.server.hmr!.host}:${devServerPort}`;
  }
}
