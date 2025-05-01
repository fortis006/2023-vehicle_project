<!-- Dashboard.vue -->
<script>
import { ref, onMounted, onUnmounted, watchEffect } from 'vue';
import ClusterOverview from './uikit/ClusterOverview.vue';
import OpsCountersChart from './uikit/OpsCountersChart.vue';
import WTConcurrentTicketsChart from './uikit/WTConcurrentTicketsChart.vue';
import WTCacheChart from './uikit/WTCacheChart.vue';
import RequestsPerSecondChart from './uikit/RequestsPerSecondChart.vue';
import { fetchClusterOverview, fetchMonitoringData } from '@/service/api.js';
import socket from '@/service/socket.js';

export default {
    name: 'Dashboard',
    components: {
        ClusterOverview,
        OpsCountersChart,
        WTConcurrentTicketsChart,
        WTCacheChart,
        RequestsPerSecondChart
    },
    setup() {
        const clusterOverview = ref(null);
        const monitoringData = ref(null);
        const error = ref(null);
        const loading = ref(true);
        const socketConnected = ref(false);

        const fetchData = async () => {
            try {
                loading.value = true;
                const response = await fetchClusterOverview();
                clusterOverview.value = response.data;
                error.value = null;
            } catch (err) {
                console.error('Error fetching cluster overview:', err);
                error.value = 'Failed to load cluster overview';
            } finally {
                loading.value = false;
            }
        };

        const fetchMonitoring = async () => {
            try {
                const response = await fetchMonitoringData();
                monitoringData.value = response.data;
            } catch (err) {
                console.error('Error fetching monitoring data:', err);
            }
        };

        let refreshInterval;

        const startPolling = () => {
            refreshInterval = setInterval(() => {
                fetchData();
                if (!socketConnected.value) {
                    fetchMonitoring();
                }
            }, 60000); // 每分鐘刷新一次
        };

        const stopPolling = () => {
            if (refreshInterval) {
                clearInterval(refreshInterval);
            }
        };

        onMounted(() => {
            fetchData();
            startPolling();

            socket.connect();
            socket.on('connect', () => {
                socketConnected.value = true;
                console.log('WebSocket connected');
            });
            socket.on('disconnect', (reason) => {
                socketConnected.value = false;
                console.log('WebSocket disconnected', reason);
            });
            socket.on('monitoring_update', (data) => {
                monitoringData.value = data;
            });
            socket.on('connect_error', (err) => {
                console.error('WebSocket connection error:', err);
                socketConnected.value = false;
            });
        });

        onUnmounted(() => {
            stopPolling();
            socket.off('monitoring_update');
            socket.off('connect');
            socket.off('disconnect');
            socket.off('connect_error');
            socket.disconnect();
        });

        watchEffect(() => {
            if (!socketConnected.value && !refreshInterval) {
                startPolling();
            } else if (socketConnected.value && refreshInterval) {
                stopPolling();
            }
        });

        return {
            clusterOverview,
            monitoringData,
            error,
            loading,
            socketConnected
        };
    }
};
</script>
<template>
    <div class="dashboard-layout">
        <div v-if="loading && !clusterOverview">Loading...</div>
        <div v-else-if="error">{{ error }}</div>
        <div v-else class="main-content">
            <!-- Cluster Overview 區塊 -->
            <cluster-overview :data="clusterOverview" />
            
            <!-- 分隔線元素 -->
            <div class="divider-line"></div>
            
            <!-- 圖表區塊 -->
            <div class="charts-grid">
                <ops-counters-chart :data="monitoringData?.ops_counters" />
                <requests-per-second-chart :data="monitoringData?.requests_per_second" />
                <WTConcurrentTicketsChart type="Read" :data="monitoringData?.wiredtiger_stats['WT - Concurrent Tickets']?.read" />
                <WTConcurrentTicketsChart type="Write" :data="monitoringData?.wiredtiger_stats['WT - Concurrent Tickets']?.write" />
                <WTCacheChart class="WTCacheChart-grid" :data="monitoringData?.wiredtiger_stats['WT - Cache']" />
            </div>
        </div>
    </div>
</template>

<style scoped>
.dashboard-layout {
    display: flex;
    flex-direction: column;
}

.main-content {
    flex: 1;
    padding: 20px;
}

/* 分隔線樣式 */
.divider-line {
    width: 100%;
    height: 1px; /* 分隔線高度 */
    background-color: #e0e0e0; /* 淡灰色 */
    margin: 20px 0; /* 增加上下間距 */
}

.charts-grid {
    font-size: 15px; /* 增大標題字體 */
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    padding: 20px;
}

.WTCacheChart-grid {
    grid-column: span 2;
}

.warning {
    background-color: #fff3cd;
    color: #856404;
    padding: 10px;
    margin-bottom: 15px;
    border-radius: 4px;
    text-align: center;
}
</style>