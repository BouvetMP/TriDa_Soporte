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
  ): Promise<PaginatedResponse<Transaction>> => {
    const response = await apiClient.get<
      ApiSuccess<PaginatedResponse<Transaction>>
    >("/transactions", {
      params: filters,
    });
    return response.data.data;
  },

  getById: async (id: number): Promise<Transaction> => {
    const response = await apiClient.get<ApiSuccess<Transaction>>(
      `/transactions/${id}`,
    );
    return response.data.data;
  },

  create: async (
    payload: CreateTransactionPayload,
  ): Promise<CreateTransactionResult> => {
    const response = await apiClient.post<ApiSuccess<CreateTransactionResult>>(
      "/transactions",
      payload,
    );
    return response.data.data;
  },

  updateStatus: async (
    id: number,
    estado: "CONFIRMADA" | "RECHAZADA",
  ): Promise<Transaction> => {
    const response = await apiClient.patch<ApiSuccess<Transaction>>(
      `/transactions/${id}/status`,
      { estado },
    );
    return response.data.data;
  },

  delete: async (id: number): Promise<DeleteTransactionResult> => {
    const response = await apiClient.delete<
      ApiSuccess<DeleteTransactionResult>
    >(`/transactions/${id}`);
    return response.data.data;
  },
};
