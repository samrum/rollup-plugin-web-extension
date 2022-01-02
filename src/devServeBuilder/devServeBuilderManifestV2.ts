import DevServeBuilder from "./devServeBuilder";

export default class DevServeBuilderManifestV2 extends DevServeBuilder {
  protected async writeBuildFiles(
    manifest: chrome.runtime.ManifestV2,
    manifestHtmlFiles: string[]
  ): Promise<void> {
    await this.writeManifestHtmlFiles(manifestHtmlFiles);
    await this.writeManifestContentScriptFiles(manifest);
  }

  protected updateContentSecurityPolicyForHmr(
    manifest: chrome.runtime.ManifestV2
  ): chrome.runtime.Manifest {
    manifest.content_security_policy =
      this.getContentSecurityPolicyWithHmrSupport(
        manifest.content_security_policy
      );

    return manifest;
  }
}
