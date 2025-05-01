<script>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { fetchClusterOverview } from '@/service/api';

export default {
    name: 'ClusterOverview',
    setup() {
        const clusterInfo = ref({
            setName: '',
            serverUptime: '',
            mongoVersion: '',
            replicaSetStatus: ''
        });
        const loading = ref(false);
        const error = ref(null);
        const lastUpdated = ref('');
        let refreshInterval = null;

        const statusClass = computed(() => ({
            'status-healthy': clusterInfo.value.replicaSetStatus === 'Healthy',
            'status-warning': clusterInfo.value.replicaSetStatus === 'Not Primary',
            'status-critical': clusterInfo.value.replicaSetStatus === 'Critical'
        }));

        const fetchClusterInfo = async (retries = 3) => {
            loading.value = true;
            error.value = null;
            try {
                const data = await fetchClusterOverview();
                clusterInfo.value = {
                    setName: data['Set Name'],
                    serverUptime: data['Server Uptime'],
                    mongoVersion: data['MongoDB Version'],
                    replicaSetStatus: data['Replica Set Status']
                };
                lastUpdated.value = new Date().toLocaleString();
                startAutoRefresh();
            } catch (err) {
                console.error('Error fetching cluster info:', err);
                if (retries > 0) {
                    console.log(`Retrying... (${retries} attempts left)`);
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                    return fetchClusterInfo(retries - 1);
                }
                error.value = `Failed to load cluster information: ${err.message}`;
                stopAutoRefresh();
            } finally {
                loading.value = false;
            }
        };

        const startAutoRefresh = () => {
            stopAutoRefresh();
            refreshInterval = setInterval(() => {
                fetchClusterInfo();
            }, 30000); // 每30秒刷新一次
        };

        const stopAutoRefresh = () => {
            if (refreshInterval) {
                clearInterval(refreshInterval);
            }
        };

        onMounted(() => {
            fetchClusterInfo();
        });

        onUnmounted(() => {
            stopAutoRefresh();
        });

        return {
            clusterInfo,
            loading,
            error,
            statusClass,
            fetchClusterInfo,
            lastUpdated
        };
    }
};
</script>

<template>
    <div v-cloak class="cluster-overview">
        <h2>基本資訊概覽</h2>
        <button @click="fetchClusterInfo" :disabled="loading">
            {{ loading ? 'Loading...' : 'Refresh' }}
        </button>
        <div v-show="loading && !clusterInfo.setName" class="loading">Loading...</div>
        <div v-if="error" class="error">
            {{ error }}
            <button @click="fetchClusterInfo" class="retry-button">Retry</button>
        </div>
        <div v-if="clusterInfo.setName" class="overview-grid">
            <div class="overview-item">
                <span class="label">資料庫名稱:</span>
                <span class="value">{{ clusterInfo.setName }}</span>
            </div>
            <div class="overview-item">
                <span class="label">已運行的時間:</span>
                <span class="value">{{ clusterInfo.serverUptime }}</span>
            </div>
            <div class="overview-item">
                <span class="label">資料庫版本:</span>
                <span class="value">{{ clusterInfo.mongoVersion }}</span>
            </div>
            <div class="overview-item">
                <span class="label">伺服器狀態:</span>
                <span class="value" :class="statusClass">
                    {{ clusterInfo.replicaSetStatus === 'Healthy' ? 'Healthy' : 'Not Primary' }}
                </span>
            </div>
        </div>
        <div v-if="lastUpdated" class="last-updated">Last updated: {{ lastUpdated }}</div>
    </div>
</template>

<style scoped>
.cluster-overview {
    background-color: #f5f5f5;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
}

h2 {
    margin-top: 0;
    margin-bottom: 15px;
}

.overview-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 15px;
    margin-bottom: 15px;
}

.overview-item {
    background-color: white;
    padding: 10px;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.label {
    font-weight: bold;
    margin-right: 10px;
}

.value {
    color: #333;
}

.status-healthy {
    color: green;
}

.status-warning {
    color: orange;
}

.status-critical {
    color: red;
}

.loading,
.error {
    padding: 20px;
    text-align: center;
    margin-bottom: 15px;
}

.error {
    color: red;
}

button {
    margin-bottom: 10px;
    padding: 5px 10px;
    background-color: #4caf50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
}

.retry-button {
    margin-left: 10px;
    background-color: #f44336;
}

.last-updated {
    font-size: 0.9em;
    color: #666;
    text-align: right;
}
</style>

<style>
[v-cloak] {
    display: none;
}
</style>
