import { Connect } from "vite";
import getEtag from "etag";

const contentScriptStyleHandler: Connect.NextHandleFunction = (
  _req,
  res,
  next
) => {
  let _originalEnd = res.end;

  // @ts-expect-error
  res.end = function end(chunk, encoding, cb) {
    if (this.req.url === "/@vite/client") {
      if (chunk) {
        chunk = chunk.replace(
          "const sheetsMap",
          "let styleTarget = document.head; const sheetsMap"
        );
        chunk = chunk.replace("export {", "export { updateStyleTarget, ");
        chunk = chunk.replace(
          "document.head.appendChild(style)",
          "styleTarget.appendChild(style)"
        );
        chunk = chunk.replace(
          "document.head.removeChild(style)",
          "styleTarget.removeChild(style)"
        );

        chunk += `
            function updateStyleTarget(newStyleTarget) {
              styleTarget = newStyleTarget;

              for (const [, style] of sheetsMap.entries()) 
              {
                styleTarget.appendChild(style);
              }
            }
          `;

        res.setHeader("Etag", getEtag(chunk, { weak: true }));
      }
    }

    return _originalEnd.call(this, chunk, encoding, cb);
  };

  next();
};

export default contentScriptStyleHandler;
