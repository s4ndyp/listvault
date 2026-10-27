migrate((app) => {
  const settings = app.settings();
  settings.meta.appName = "ListVault";
  app.save(settings);
});
