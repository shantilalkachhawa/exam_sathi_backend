module.exports = ({ User, Address, Category, Product, Cart, Payment, Order, Store }) => {

  // ---------------------------
  // USER <-> ADDRESS
  // ---------------------------
  User.hasMany(Address, {
    foreignKey: "userId",
    as: "addresses",
  });
  Address.belongsTo(User, {
    foreignKey: "userId",
    as: "user",
  });

  // ---------------------------
  // USER <-> ORDER
  // ---------------------------
  User.hasMany(Order, {
    foreignKey: "userId",
    as: "orders",
  });
  Order.belongsTo(User, {
    foreignKey: "userId",
    as: "user",
  });

  // ---------------------------
  // CATEGORY <-> PRODUCT
  // ---------------------------
  Category.hasMany(Product, {
    foreignKey: "categoryId",
    as: "products",
    onDelete: "SET NULL",
    onUpdate: "CASCADE",
  });

  Product.belongsTo(Category, {
    foreignKey: "categoryId",
    as: "category",
    onDelete: "SET NULL",
    onUpdate: "CASCADE",
  });

  // ---------------------------
  // PRODUCT <-> CART
  // ---------------------------
  Product.hasMany(Cart, {
    foreignKey: "productId",
    as: "cartItems",
  });

  Cart.belongsTo(Product, {
    foreignKey: "productId",
    as: "product",
  });

  // ---------------------------
  // CART <-> USER
  // ---------------------------
  Cart.belongsTo(User, {
    foreignKey: "userId",
    as: "user",
  });

  // ---------------------------
  // OPTIONAL (if you use Store model)
  // STORE <-> PRODUCT
  // ---------------------------
  if (Store) {
    Store.hasMany(Product, {
      foreignKey: "storeId",
      as: "products",
    });

    Product.belongsTo(Store, {
      foreignKey: "storeId",
      as: "store",
    });
  }

  console.log("[Associations Loaded Successfully]");
};
