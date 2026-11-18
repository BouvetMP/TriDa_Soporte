import { useState, useCallback, useEffect } from "react";
import { CategoriesApi } from "@/api/Categories";
import { Category, CreateCategoryPayload } from "@/types/Category";
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

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    isLoading,
    refreshCategories: fetchCategories,
    createCategory,
  };
};
