import { prisma } from "../../db/prisma.js";
import { AppError } from "../../utils/AppError.js";

type CategoryData = {
  nombre?: string;
  tipo?: "INGRESO" | "GASTO" | "AHORRO";
  icono?: string | null;
  color?: string;
  estado?: boolean;
};

export class CategoryError extends AppError {}

function withOwnership(category: Awaited<ReturnType<typeof prisma.categoria.findFirst>>) {
  if (!category) {
    throw new CategoryError("Categoría no encontrada", 404);
  }

  return {
    ...category,
    es_personalizada: category.id_usuario !== null,
  };
}

export class CategoriesService {
  async getCategories(userId: number) {
    const categories = await prisma.categoria.findMany({
      where: {
        estado: true,
        OR: [{ id_usuario: userId }, { id_usuario: null }],
      },
    });

    return categories.map((category) => ({
      ...category,
      es_personalizada: category.id_usuario !== null,
    }));
  }

  async list(userId: number) {
    return this.getCategories(userId);
  }

  async getCategoryById(userId: number, categoryId: number) {
    const category = await prisma.categoria.findFirst({
      where: {
        id_categoria: categoryId,
        estado: true,
        OR: [{ id_usuario: userId }, { id_usuario: null }],
      },
    });

    return withOwnership(category);
  }

  async getById(userId: number, categoryId: number) {
    return this.getCategoryById(userId, categoryId);
  }

  async createCategory(userId: number, data: CategoryData) {
    if (!data.nombre?.trim()) {
      throw new CategoryError("El nombre de la categoría es requerido", 400);
    }

    const duplicate = await prisma.categoria.findFirst({
      where: {
        estado: true,
        nombre: { equals: data.nombre.trim(), mode: "insensitive" },
        OR: [{ id_usuario: userId }, { id_usuario: null }],
      },
      select: { id_categoria: true },
    });
    if (duplicate) {
      throw new CategoryError("Ya existe una categoría con ese nombre", 409);
    }

    const category = await prisma.categoria.create({
      data: {
        id_usuario: userId,
        nombre: data.nombre.trim(),
        tipo: data.tipo ?? "GASTO",
        icono: data.icono ?? "tag",
        color: data.color ?? "#2563eb",
      },
    });

    return {
      ...category,
      es_personalizada: true,
    };
  }

  async create(userId: number, data: CategoryData) {
    return this.createCategory(userId, data);
  }

  async updateCategory(userId: number, categoryId: number, data: CategoryData) {
    const existing = await this.getCategoryById(userId, categoryId);
    if (!existing.es_personalizada) {
      throw new CategoryError("No se pueden modificar las categorías por sistema", 403);
    }

    const updateData: CategoryData = {};
    if (data.nombre !== undefined) updateData.nombre = data.nombre;
    if (data.tipo !== undefined) updateData.tipo = data.tipo;
    if (data.icono !== undefined) updateData.icono = data.icono;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.estado !== undefined) updateData.estado = data.estado;

    if (data.nombre !== undefined && data.nombre.trim().toLocaleLowerCase() !== existing.nombre.toLocaleLowerCase()) {
      const duplicate = await prisma.categoria.findFirst({
        where: {
          id_categoria: { not: categoryId },
          estado: true,
          nombre: { equals: data.nombre.trim(), mode: "insensitive" },
          OR: [{ id_usuario: userId }, { id_usuario: null }],
        },
        select: { id_categoria: true },
      });
      if (duplicate) {
        throw new CategoryError("Ya existe una categoría con ese nombre", 409);
      }
    }

    const category = await prisma.categoria.update({
      where: { id_categoria: categoryId },
      data: updateData,
    });

    return {
      ...category,
      es_personalizada: true,
    };
  }

  async update(userId: number, categoryId: number, data: CategoryData) {
    return this.updateCategory(userId, categoryId, data);
  }

  async deleteCategory(userId: number, categoryId: number) {
    const existing = await this.getCategoryById(userId, categoryId);
    if (!existing.es_personalizada) {
      throw new CategoryError("No se pueden eliminar las categorías por sistema", 403);
    }

    return prisma.categoria.update({
      where: { id_categoria: categoryId },
      data: { estado: false },
    });
  }

  async delete(userId: number, categoryId: number) {
    return this.deleteCategory(userId, categoryId);
  }
}

export const categoriesService = new CategoriesService();
export const categoryService = categoriesService;
