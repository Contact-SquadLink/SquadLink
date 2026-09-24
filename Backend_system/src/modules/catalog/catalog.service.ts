import { AppError } from "../../utils/app-error";

import type {
  CreateCategoryInput,
  CreateProductInput,
  UpdateCategoryInput,
  UpdateProductInput
} from "./catalog.schemas";

import {
  createCategory,
  createProduct,
  findCategoryById,
  findCategoryByName,
  findProductByCategoryAndName,
  findProductById,
  listCategories,
  listProducts,
  listPlatformProducts,
  updateCategory,
  updateProduct
} from "./catalog.repository";

export async function getCategories() {
  return listCategories();
}

export async function registerCategory(
  input: CreateCategoryInput
) {
  const existingCategory =
    await findCategoryByName(input.name);

  if (existingCategory) {
    throw new AppError(
      "A category with this name already exists.",
      409,
      "CATEGORY_ALREADY_EXISTS"
    );
  }

  return createCategory(input);
}

export async function modifyCategory(
  categoryId: string,
  input: UpdateCategoryInput
) {
  const existingCategory =
    await findCategoryById(categoryId);

  if (!existingCategory) {
    throw new AppError(
      "Category not found.",
      404,
      "CATEGORY_NOT_FOUND"
    );
  }

  if (
    input.name &&
    input.name.toLowerCase() !==
      existingCategory.name.toLowerCase()
  ) {
    const duplicate =
      await findCategoryByName(input.name);

    if (duplicate) {
      throw new AppError(
        "A category with this name already exists.",
        409,
        "CATEGORY_ALREADY_EXISTS"
      );
    }
  }

  const updated =
    await updateCategory(
      categoryId,
      input
    );

  if (!updated) {
    throw new AppError(
      "Category not found.",
      404,
      "CATEGORY_NOT_FOUND"
    );
  }

  return updated;
}

export async function getProducts() {
  return listProducts();
}

export async function getPlatformProducts() {
  return listPlatformProducts();
}

export async function registerProduct(
  input: CreateProductInput
) {
  const category =
    await findCategoryById(
      input.categoryId
    );

  if (!category) {
    throw new AppError(
      "Category not found.",
      404,
      "CATEGORY_NOT_FOUND"
    );
  }

  if (!category.isActive) {
    throw new AppError(
      "Cannot add a product to an inactive category.",
      409,
      "CATEGORY_INACTIVE"
    );
  }

  const existingProduct =
    await findProductByCategoryAndName(
      input.categoryId,
      input.name
    );

  if (existingProduct) {
    throw new AppError(
      "A product with this name already exists in this category.",
      409,
      "PRODUCT_ALREADY_EXISTS"
    );
  }

  return createProduct(input);
}

export async function modifyProduct(
  productId: string,
  input: UpdateProductInput
) {
  const existingProduct =
    await findProductById(productId);

  if (!existingProduct) {
    throw new AppError(
      "Product not found.",
      404,
      "PRODUCT_NOT_FOUND"
    );
  }

  if (input.categoryId) {
    const category =
      await findCategoryById(
        input.categoryId
      );

    if (!category) {
      throw new AppError(
        "Category not found.",
        404,
        "CATEGORY_NOT_FOUND"
      );
    }

    if (!category.isActive) {
      throw new AppError(
        "Cannot move a product to an inactive category.",
        409,
        "CATEGORY_INACTIVE"
      );
    }
  }

  const targetCategoryId =
    input.categoryId ??
    existingProduct.categoryId;

  const targetName =
    input.name ??
    existingProduct.name;

  if (
    targetCategoryId !==
      existingProduct.categoryId ||
    targetName.toLowerCase() !==
      existingProduct.name.toLowerCase()
  ) {
    const duplicate =
      await findProductByCategoryAndName(
        targetCategoryId,
        targetName
      );

    if (
      duplicate &&
      duplicate.id !== productId
    ) {
      throw new AppError(
        "A product with this name already exists in this category.",
        409,
        "PRODUCT_ALREADY_EXISTS"
      );
    }
  }

  const updated =
    await updateProduct(
      productId,
      input
    );

  if (!updated) {
    throw new AppError(
      "Product not found.",
      404,
      "PRODUCT_NOT_FOUND"
    );
  }

  return updated;
}