import { apiClient } from "./Client";
import { ApiSuccess, PaginatedResponse } from "@/types/Api";
import {
  Transaction,
  CreateTransactionPayload,
  CreateTransactionResult,
  DeleteTransactionResult,
  TransactionFilters,
} from "@/types/Transaction";

export const TransactionsApi = {
  getAll: async (
    filters: TransactionFilters = {},
  ): Promise<ApiSuccess<PaginatedResponse<Transaction>>> => {
    const response = await apiClient.get<
      ApiSuccess<PaginatedResponse<Transaction>>
    >("/transactions", {
      params: filters,
    });
    return response.data;
  },

  getById: async (id: number): Promise<ApiSuccess<Transaction>> => {
    const response = await apiClient.get<ApiSuccess<Transaction>>(
      `/transactions/${id}`,
    );
    return response.data;
  },

  create: async (
    payload: CreateTransactionPayload,
  ): Promise<ApiSuccess<CreateTransactionResult>> => {
    const response = await apiClient.post<ApiSuccess<CreateTransactionResult>>(
      "/transactions",
      payload,
    );
    return response.data;
  },

  updateStatus: async (
    id: number,
    estado: "CONFIRMADA" | "RECHAZADA",
  ): Promise<ApiSuccess<Transaction>> => {
    const response = await apiClient.patch<ApiSuccess<Transaction>>(
      `/transactions/${id}/status`,
      { estado },
    );
    return response.data;
  },

  delete: async (id: number): Promise<ApiSuccess<DeleteTransactionResult>> => {
    const response = await apiClient.delete<ApiSuccess<DeleteTransactionResult>>(
      `/transactions/${id}`,
    );
    return response.data;
  },
};
