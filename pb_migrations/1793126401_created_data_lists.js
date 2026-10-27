migrate(
  (app) => {
    const collection = new Collection({
      type: "base",
      name: "data_lists",
      listRule: "",
      viewRule: "",
      createRule: "",
      updateRule: "",
      deleteRule: "",
      fields: [
        {
          name: "name",
          type: "text",
          required: true,
          min: 1,
          max: 200,
          presentable: true,
        },
        {
          name: "tags",
          type: "json",
          maxSize: 50000,
        },
        {
          name: "columns",
          type: "json",
          maxSize: 50000,
        },
        {
          name: "columnSettings",
          type: "json",
          maxSize: 200000,
        },
        {
          name: "hiddenColumns",
          type: "json",
          maxSize: 50000,
        },
        {
          name: "rows",
          type: "json",
          maxSize: 5000000,
        },
        {
          name: "isFavorite",
          type: "bool",
        },
        {
          name: "created",
          type: "autodate",
          onCreate: true,
          onUpdate: false,
        },
        {
          name: "updated",
          type: "autodate",
          onCreate: true,
          onUpdate: true,
        },
      ],
    });

    app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("data_lists");
    app.delete(collection);
  }
);
