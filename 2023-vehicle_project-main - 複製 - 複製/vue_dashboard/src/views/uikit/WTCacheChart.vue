<!-- WTCacheChart.vue -->
<script>
import { ref, onMounted, onUnmounted } from 'vue';
import Chart from 'chart.js/auto';
import { fetchWiredTigerStats } from '@/service/api';
import { getSocket } from '@/service/socket';

export default {
    name: 'WTCacheChart',
    setup() {
        const chartCanvas = ref(null);
        let chart = null;
        const latestStats = ref({});
        const error = ref(null);
        const loading = ref(true);
        const socketConnected = ref(false);

        const colors = {
            used: 'rgb(255, 99, 132)',
            dirty: 'rgb(255, 205, 86)',
            readIntoDisk: 'rgb(54, 162, 235)'
        };

        const createChart = () => {
            const ctx = chartCanvas.value.getContext('2d');
            chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [
                        { label: 'Used', data: [], borderColor: colors.used, fill: false },
                        { label: 'Dirty', data: [], borderColor: colors.dirty, fill: false },
                        { label: 'Read Into', data: [], borderColor: colors.readIntoDisk, fill: false }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { type: 'time', time: { unit: 'minute' } },
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: 'Cache Size (MB)' }
                        }
                    },
                    plugins: {
                        tooltip: {
                            mode: 'index',
                            intersect: false
                        },
                        legend: {
                            position: 'top'
                        }
                    }
                }
            });
        };

        const updateChart = (newData) => {
            if (!chart) return;
            const now = new Date();
            chart.data.labels.push(now);
            chart.data.datasets.forEach((dataset) => {
                const value = newData[dataset.label.toLowerCase().replace(' ', '_')];
                dataset.data.push(value / 1024 / 1024); // 轉換為 MB
            });

            if (chart.data.labels.length > 50) {
                chart.data.labels.shift();
                chart.data.datasets.forEach((dataset) => dataset.data.shift());
            }

            chart.update();

            // Update latest stats
            latestStats.value = Object.keys(newData).reduce((acc, category) => {
                const dataSet = chart.data.datasets.find((ds) => ds.label.toLowerCase().replace(' ', '_') === category).data;
                acc[category] = {
                    min: Math.min(...dataSet).toFixed(2),
                    max: Math.max(...dataSet).toFixed(2),
                    avg: (dataSet.reduce((sum, value) => sum + value, 0) / dataSet.length).toFixed(2)
                };
                return acc;
            }, {});
        };

        const fetchData = async () => {
            try {
                const data = await fetchWiredTigerStats();
                const wtCacheData = data['WT - Cache'];
                updateChart({
                    used: wtCacheData['Used'],
                    dirty: wtCacheData['Dirty'],
                    read_into: wtCacheData['Read into']
                });
                error.value = null;
            } catch (err) {
                console.error('Error fetching WT Cache data:', err);
                error.value = 'Failed to load data';
            } finally {
                loading.value = false;
            }
        };

        onMounted(() => {
            createChart();
            fetchData(); // 初始數據獲取

            const socket = getSocket();

            socket.on('connect', () => {
                console.log('WebSocket connected');
                socketConnected.value = true;
            });

            socket.on('disconnect', () => {
                console.log('WebSocket disconnected');
                socketConnected.value = false;
            });

            socket.on('monitoring_update', (data) => {
                if (data && data.wiredtiger_stats && data.wiredtiger_stats['WT - Cache']) {
                    const wtCacheData = data.wiredtiger_stats['WT - Cache'];
                    updateChart({
                        used: wtCacheData['Used'],
                        dirty: wtCacheData['Dirty'],
                        read_into: wtCacheData['Read into']
                    });
                }
            });

            socket.on('connect_error', (err) => {
                console.error('WebSocket connection error:', err);
                error.value = 'WebSocket connection error';
            });
        });

        onUnmounted(() => {
            const socket = getSocket();
            socket.off('monitoring_update');
            if (chart) chart.destroy();
        });

        return { chartCanvas, latestStats, error, loading, socketConnected };
    }
};
</script>

<template>
    <div class="wt-cache-chart">
        <h3>WT - 快取</h3>
        <div v-if="loading">Loading...</div>
        <div v-else-if="error">{{ error }}</div>
        <div v-else-if="!socketConnected" class="warning">快取使用情況</div>
        <canvas ref="chartCanvas"></canvas>
        <div v-if="!loading && !error" class="stats-summary">
            <div v-for="(stat, category) in latestStats" :key="category" class="stat-item">
                <span class="category">{{ category }}:</span>
                <span class="value">min: {{ stat.min }} MB, max: {{ stat.max }} MB, avg: {{ stat.avg }} MB</span>
            </div>
        </div>
    </div>
</template>

<style scoped>
.wt-cache-chart {
    background-color: white;
    border-radius: 8px;
    padding: 15px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

h3 {
    margin-top: 0;
    margin-bottom: 15px;
}

canvas {
    width: 100% !important;
    height: 300px !important;
}

.stats-summary {
    margin-top: 15px;
    font-size: 0.9em;
}

.stat-item {
    margin-bottom: 5px;
}

.category {
    font-weight: bold;
    margin-right: 5px;
}

.value {
    color: #666;
}
.warning {
    color: orange;
    margin-bottom: 10px;
}
</style>
