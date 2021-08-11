(async () => {
  const importable = await import("./importable");

  importable();

  console.log("content2");
})();
