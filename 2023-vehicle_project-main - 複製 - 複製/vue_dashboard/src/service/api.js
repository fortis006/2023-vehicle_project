import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

const api = axios.create({
    baseURL: API_URL,
    timeout: 10000 // 設置超時時間為 10 秒
});

const request = async (method, url, data = null, config = {}) => {
    try {
        const response = await api({ method, url, data, ...config });
        return response.data;
    } catch (error) {
        console.error(`Error in ${method.toUpperCase()} ${url}:`, error);
        throw error;
    }
};

export const fetchClusterOverview = () => request('get', '/api/cluster_overview');
export const fetchOpsCounters = () => request('get', '/api/ops_counters');
export const fetchRequestsPerSecond = () => request('get', '/api/requests_per_second');
export const fetchWiredTigerStats = () => request('get', '/api/wiredtiger_stats');
export const fetchAllStats = () => request('get', '/api/all_stats');

// 新增的 fetchMonitoringData 函數
export const fetchMonitoringData = () => request('get', '/api/monitoring_data');

// 如果你的後端沒有單獨的監控數據端點，你可以使用現有的端點組合：
// export const fetchMonitoringData = async () => {
//     const [opsCounters, requestsPerSecond, wiredTigerStats] = await Promise.all([
//         fetchOpsCounters(),
//         fetchRequestsPerSecond(),
//         fetchWiredTigerStats()
//     ]);
//     return {
//         ops_counters: opsCounters,
//         requests_per_second: requestsPerSecond,
//         wiredtiger_stats: wiredTigerStats
//     };
// };

export default api;