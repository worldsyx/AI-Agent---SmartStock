import apiClient, { buildQuery } from './apiClient';

export const api = {
  /* ── Manager Endpoints (PRD 12.2) ── */
  getManagerSummary:  ()       => apiClient.get('/manager/dashboard/summary'),
  getManagerAlerts:   ()       => apiClient.get('/manager/dashboard/alerts'),
  getMorningReport:   (params) => apiClient.get(`/manager/reports/morning${buildQuery(params)}`),
  getDailyReport:     (params) => apiClient.get(`/manager/reports/daily${buildQuery(params)}`),

  /* ── AI Chat Manager (PRD 12.8) ── */
  getAiChatSessions:   ()          => apiClient.get('/manager/ai-chat/sessions'),
  createAiChatSession: (data)      => apiClient.post('/manager/ai-chat/sessions', data),
  getAiChatSession:    (id)        => apiClient.get(`/manager/ai-chat/sessions/${id}`),
  sendAiChatMessage:   (id, data)  => apiClient.post(`/manager/ai-chat/sessions/${id}/messages`, data),
  confirmAiChatConfig: (data)      => apiClient.post('/manager/ai-chat/configuration/confirm', data),

  /* ── AI Performance & Analytics (PRD AI Accuracy & Performance Evaluation) ── */
  getAiPerformanceOverview:      ()       => apiClient.get('/manager/ai-performance/overview'),
  getAiPerformanceStatistics:    ()       => apiClient.get('/manager/ai-performance/statistics'),
  getAiPerformanceModels:        ()       => apiClient.get('/manager/ai-performance/models'),
  getAiPerformanceTrends:        (params) => apiClient.get(`/manager/ai-performance/trends${buildQuery(params)}`),
  getAiPerformanceErrors:        ()       => apiClient.get('/manager/ai-performance/error-analysis'),
  getAiPerformanceHistory:       (params) => apiClient.get(`/manager/ai-performance/history${buildQuery(params)}`),
  getAiPerformanceHistoryDetail: (id)     => apiClient.get(`/manager/ai-performance/history/${id}`),
  runAiPerformanceTest:          (data)   => apiClient.post('/manager/ai-performance/test-run', data),
  getAiPerformanceExportUrl:     (params) => `/api/v1/manager/ai-performance/export${buildQuery(params)}`,

  /* ── Operator Workspace (PRD 12.3) ── */
  getOperatorHome:    ()       => apiClient.get('/operator/home'),
  getOperatorTasks:   ()       => apiClient.get('/operator/tasks'),
  getOperatorHistory: (params) => apiClient.get(`/operator/history${buildQuery(params)}`),

  /* ── QR Scanner & Resolution (PRD 12.6) ── */
  resolveQr: (code)  => apiClient.post('/qr/resolve', { code }),
  getQr:     (code)  => apiClient.get(`/qr/${code}`),

  /* ── Unified Settings (PRD 12.9) ── */
  getSettings:       ()       => apiClient.get('/settings'),
  updateProfile:     (data)   => apiClient.patch('/settings/profile', data),
  updatePreferences: (data)   => apiClient.patch('/settings/preferences', data),
  updateAiConfig:    (data)   => apiClient.patch('/settings/ai', data),

  /* ── Products / Master ── */
  getProducts:  (params) => apiClient.get(`/products${buildQuery(params)}`),
  getProduct:   (id)     => apiClient.get(`/products/${id}`),
  createProduct:(data)   => apiClient.post('/products', data),
  updateProduct:(id,data)=> apiClient.patch(`/products/${id}`, data),

  /* ── Vendors ── */
  getVendors:   (params) => apiClient.get(`/vendors${buildQuery(params)}`),
  getVendor:    (id)     => apiClient.get(`/vendors/${id}`),
  createVendor: (data)   => apiClient.post('/vendors', data),
  updateVendor: (id,data)=> apiClient.patch(`/vendors/${id}`, data),

  /* ── Warehouses & Locations ── */
  getWarehouses:   (params) => apiClient.get(`/warehouses${buildQuery(params)}`),
  createWarehouse: (data)   => apiClient.post('/warehouses', data),
  getLocations:    (params) => apiClient.get(`/locations${buildQuery(params)}`),
  getLocation:     (id)     => apiClient.get(`/locations/${id}`),
  createLocation:  (data)   => apiClient.post('/locations', data),

  /* ── Inventory Balances & Lots ── */
  getInventory:         (params) => apiClient.get(`/inventory${buildQuery(params)}`),
  getInventoryByProduct:(id)     => apiClient.get(`/inventory/${id}`),
  getInventoryLot:      (id)     => apiClient.get(`/inventory/lots/${id}`),

  /* ── Transactions ── */
  createReceipt:   (data) => apiClient.post('/transactions/receipts', data),
  createIssue:     (data) => apiClient.post('/transactions/issues', data),
  createTransfer:  (data) => apiClient.post('/transactions/transfers', data),
  getTransactions: (params)=> apiClient.get(`/transactions${buildQuery(params)}`),
  getTransaction:  (id)    => apiClient.get(`/transactions/${id}`),

  /* ── Stock Opname ── */
  createStocktake:       (data)   => apiClient.post('/stocktakes', data),
  getStocktakes:         (params) => apiClient.get(`/stocktakes${buildQuery(params)}`),
  getStocktake:          (id)     => apiClient.get(`/stocktakes/${id}`),
  submitStocktakeCount:  (id,data)=> apiClient.post(`/stocktakes/${id}/count`, data),
  submitStocktake:       (id)     => apiClient.post(`/stocktakes/${id}/submit`),
  approveStocktake:      (id,data)=> apiClient.post(`/stocktakes/${id}/approve`, data),
  rejectStocktake:       (id,data)=> apiClient.post(`/stocktakes/${id}/reject`, data),

  /* ── AI Findings ── */
  getAiFindings:    (params) => apiClient.get(`/ai/findings${buildQuery(params)}`),
  getAiFinding:     (id)     => apiClient.get(`/ai/findings/${id}`),
  reviewAiFinding:  (id,data)=> apiClient.post(`/ai/findings/${id}/review`, data),
  approveAiFinding: (id,data)=> apiClient.post(`/ai/findings/${id}/approve`, data),
  rejectAiFinding:  (id,data)=> apiClient.post(`/ai/findings/${id}/reject`, data),
  resolveAiFinding: (id,data)=> apiClient.post(`/ai/findings/${id}/resolve`, data),
  runAgent:         (type)   => apiClient.post(`/ai/run/${type}`),

  /* ── Reports & Audit Logs ── */
  getInventoryReport:   (p)=> apiClient.get(`/reports/inventory${buildQuery(p)}`),
  getTransactionReport: (p)=> apiClient.get(`/reports/transactions${buildQuery(p)}`),
  getCapacityReport:    (p)=> apiClient.get(`/reports/capacity${buildQuery(p)}`),
  getAgingReport:       (p)=> apiClient.get(`/reports/aging${buildQuery(p)}`),
  getAuditLogs:         (p)=> apiClient.get(`/audit-logs${buildQuery(p)}`),

  /* ── Legacy Aliases ── */
  getDashboardSummary: () => apiClient.get('/dashboard/summary'),
  getDashboardAlerts:  () => apiClient.get('/dashboard/alerts'),

  /* ── Users (Admin only) ── */
  getUsers:   (params) => apiClient.get(`/users${buildQuery(params)}`),
  createUser: (data)   => apiClient.post('/users', data),
};

export default api;
