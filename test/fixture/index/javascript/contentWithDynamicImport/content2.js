(async () => {
  const importable = await import("./../shared/importable");

  importable();

  console.log("content2");
})();
