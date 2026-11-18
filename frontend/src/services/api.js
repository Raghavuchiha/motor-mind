import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000",
  timeout: 120000,
});

export const checkBackend = async () => (await api.get("/")).data;
export const getModelStatus = async () => (await api.get("/api/model-status")).data;
export const predictMachine = async (machineData) => (await api.post("/api/predict", machineData)).data;
export const getFleetOverview = async () => (await api.get("/api/fleet-overview")).data;
export const getDatasets = async () => (await api.get("/api/datasets")).data;
export const uploadDataset = async (file) => {
  const body = new FormData();
  body.append("file", file);
  return (await api.post("/api/datasets/upload", body)).data;
};
export const getDataset = async (id) => (await api.get(`/api/datasets/${id}`)).data;
export const saveDatasetMapping = async (id, mapping, confirm_units = false) =>
  (await api.put(`/api/datasets/${id}/mapping`, { mapping, confirm_units })).data;
export const validateDataset = async (id) =>
  (await api.post(`/api/datasets/${id}/validate`)).data;
export const predictDataset = async (id) =>
  (await api.post(`/api/datasets/${id}/predict`)).data;
export default api;
