const mongoose = require("mongoose");
const Product = require("../models/product");

const validProductData = () => ({
  name: "Basmati Rice 5kg",
  price: 450,
  description: "Premium long-grain rice",
  image: "https://example.com/rice.jpg",
  store: new mongoose.Types.ObjectId(),
});

describe("Product model — automated validation and defaults", () => {
  test("accepts a product with all required fields", () => {
    expect(new Product(validProductData()).validateSync()).toBeUndefined();
  });

  test("requires a product name", () => {
    const data = validProductData();
    delete data.name;
    expect(new Product(data).validateSync().errors.name).toBeDefined();
  });

  test("requires a product price", () => {
    const data = validProductData();
    delete data.price;
    expect(new Product(data).validateSync().errors.price).toBeDefined();
  });

  test("requires a product description", () => {
    const data = validProductData();
    delete data.description;
    expect(new Product(data).validateSync().errors.description).toBeDefined();
  });

  test("requires a product image", () => {
    const data = validProductData();
    delete data.image;
    expect(new Product(data).validateSync().errors.image).toBeDefined();
  });

  test("requires a store reference", () => {
    const data = validProductData();
    delete data.store;
    expect(new Product(data).validateSync().errors.store).toBeDefined();
  });

  test("defaults category to General", () => {
    expect(new Product(validProductData()).category).toBe("General");
  });

  test("defaults brand to Local Brand", () => {
    expect(new Product(validProductData()).brand).toBe("Local Brand");
  });

  test("defaults unit to 1 unit", () => {
    expect(new Product(validProductData()).unit).toBe("1 unit");
  });

  test("defaults stock to 20", () => {
    expect(new Product(validProductData()).stock).toBe(20);
  });

  test("defaults availableStock to 20", () => {
    expect(new Product(validProductData()).availableStock).toBe(20);
  });

  test("defaults reservedStock to zero", () => {
    expect(new Product(validProductData()).reservedStock).toBe(0);
  });

  test("defaults soldStock to zero", () => {
    expect(new Product(validProductData()).soldStock).toBe(0);
  });

  test("defaults incomingStock to zero", () => {
    expect(new Product(validProductData()).incomingStock).toBe(0);
  });

  test("defaults damagedStock to zero", () => {
    expect(new Product(validProductData()).damagedStock).toBe(0);
  });

  test("defaults reorderLevel to five", () => {
    expect(new Product(validProductData()).reorderLevel).toBe(5);
  });

  test("defaults safetyStock to three", () => {
    expect(new Product(validProductData()).safetyStock).toBe(3);
  });

  test("defaults product availability to true", () => {
    expect(new Product(validProductData()).available).toBe(true);
  });

  test("defaults rating and ratingCount", () => {
    const product = new Product(validProductData());
    expect(product.rating).toBe(4.8);
    expect(product.ratingCount).toBe(12);
  });

  test("defaults tags to an empty array", () => {
    expect(new Product(validProductData()).tags).toEqual([]);
  });
});
