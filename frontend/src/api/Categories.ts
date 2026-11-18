import { apiClient } from "./Client";
import { ApiSuccess } from "@/types/Api";
import {
  Category,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from "@/types/Category";

export const CategoriesApi = {
  getAll: async (): Promise<ApiSuccess<Category[]>> => {
    const response = await apiClient.get<ApiSuccess<Category[]>>("/categories");
    return response.data;
  },

  create: async (
    payload: CreateCategoryPayload,
  ): Promise<ApiSuccess<Category>> => {
    const response = await apiClient.post<ApiSuccess<Category>>(
      "/categories",
      payload,
    );
    return response.data;
  },

  update: async (
    id: number,
    payload: UpdateCategoryPayload,
  ): Promise<ApiSuccess<Category>> => {
    const response = await apiClient.patch<ApiSuccess<Category>>(
      `/categories/${id}`,
      payload,
    );
    return response.data;
  },

  delete: async (id: number): Promise<ApiSuccess<void>> => {
    const response = await apiClient.delete<ApiSuccess<void>>(
      `/categories/${id}`,
    );
    return response.data;
  },
};
