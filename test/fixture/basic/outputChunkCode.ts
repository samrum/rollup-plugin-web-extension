export const chunkCodeContentWithImport = `function importable() {
  console.log("importable");
}

importable();
console.log("content");
`;

export const chunkCodeImportable = `function importable() {
  console.log("importable");
}

export { importable as i };
`;

export const chunkCodeContentWithChunkedImport = `import { i as importable } from '../../../importable-c4117e7c.js';

importable();
console.log("content");
`;

export const chunkCodeContentWithChunkedImport2 = `import { i as importable } from '../../../importable-c4117e7c.js';

importable();
console.log("content2");
`;

export const chunkCodeImportableDynamic = `function importable() {
  console.log("importable");
}

export { importable as default };
`;

export const chunkCodeContentWithChunkedDynamicImport = `(async () => {
  const importable = await import('../../../importable-5243f143.js');

  importable();

  console.log("content");
})();
`;

export const chunkCodeContentWithChunkedDynamicImport2 = `(async () => {
  const importable = await import('../../../importable-5243f143.js');

  importable();

  console.log("content2");
})();
`;
