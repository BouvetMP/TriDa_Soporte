import { useState, useCallback, useEffect } from "react";
import { CategoriesApi } from "@/api/Categories";
import {
  Category,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from "@/types/Category";
import { useToast } from "@/components/ui/Toast";

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { showToast } = useToast();

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await CategoriesApi.getAll();
      if (response.success) {
        setCategories(response.data);
      } else {
        showToast({
          type: "error",
          title: "Error al cargar categorías",
          message: "La respuesta del servidor no fue exitosa.",
        });
      }
    } catch (error) {
      const err = error as Error;
      showToast({
        type: "error",
        title: "Error al cargar categorías",
        message: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  const createCategory = async (
    payload: CreateCategoryPayload,
  ): Promise<Category | null> => {
    try {
      const response = await CategoriesApi.create(payload);
      if (response.success) {
        setCategories((prev) => [...prev, response.data]);
        showToast({
          type: "success",
          title: "Categoría creada",
          message: "La categoría se registró correctamente.",
        });
        return response.data;
      }
      showToast({
        type: "error",
        title: "Error",
        message: "La respuesta del servidor no fue exitosa.",
      });
    } catch (error) {
      const err = error as Error;
      showToast({
        type: "error",
        title: "Error",
        message: err.message || "No se pudo crear la categoría.",
      });
    }
    return null;
  };

  const updateCategory = async (
    id: number,
    payload: UpdateCategoryPayload,
  ): Promise<Category | null> => {
    try {
      const response = await CategoriesApi.update(id, payload);
      if (response.success) {
        setCategories((prev) =>
          prev.map((category) =>
            category.id_categoria === id ? response.data : category,
          ),
        );
        showToast({
          type: "success",
          title: "Categoría actualizada",
          message: "Los cambios se guardaron correctamente.",
        });
        return response.data;
      }
      showToast({
        type: "error",
        title: "Error al actualizar categoría",
        message: "La respuesta del servidor no fue exitosa.",
      });
    } catch (error) {
      const err = error as Error;
      showToast({
        type: "error",
        title: "Error al actualizar categoría",
        message: err.message || "No se pudo actualizar la categoría.",
      });
    }
    return null;
  };

  const deleteCategory = async (id: number): Promise<boolean> => {
    try {
      const response = await CategoriesApi.delete(id);
      if (response.success) {
        setCategories((prev) =>
          prev.filter((category) => category.id_categoria !== id),
        );
        showToast({
          type: "success",
          title: "Categoría desactivada",
          message: "La categoría ya no aparecerá en tus movimientos nuevos.",
        });
        return true;
      }
      showToast({
        type: "error",
        title: "Error al desactivar categoría",
        message: "La respuesta del servidor no fue exitosa.",
      });
    } catch (error) {
      const err = error as Error;
      showToast({
        type: "error",
        title: "Error al desactivar categoría",
        message: err.message || "No se pudo desactivar la categoría.",
      });
    }
    return false;
  };

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    isLoading,
    refreshCategories: fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  };
};
