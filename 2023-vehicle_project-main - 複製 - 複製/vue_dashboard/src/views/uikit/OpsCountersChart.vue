<script>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue';
import Chart from 'chart.js/auto';
import { fetchOpsCounters } from '@/service/api';
import { getSocket } from '@/service/socket';

export default {
    name: 'OpsCountersChart',
    setup() {
        const chartCanvas = ref(null);
        let chart = null;
        const error = ref(null);
        const loading = ref(true);
        const socketConnected = ref(false);
        const latestData = ref({});

        const colors = {
            command: 'rgb(255, 99, 132)',
            delete: 'rgb(54, 162, 235)',
            getmore: 'rgb(75, 192, 192)',
            insert: 'rgb(153, 102, 255)',
            query: 'rgb(255, 159, 64)',
            update: 'rgb(201, 203, 207)'
        };

        const createChart = () => {
            nextTick(() => {
                if (!chartCanvas.value) {
                    console.error('Chart canvas not found');
                    return;
                }
                const ctx = chartCanvas.value.getContext('2d');
                chart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: [],
                        datasets: Object.keys(colors).map(key => ({
                            label: key,
                            data: [],
                            borderColor: colors[key],
                            fill: false
                        }))
                    },
                    options: {
                        responsive: true,
                        scales: {
                            x: {
                                type: 'time',
                                time: { unit: 'second' }
                            },
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Count'
                                }
                            }
                        }
                    }
                });
            });
        };

        const updateChart = (newData) => {
            if (!newData || !chart) return;
            const now = new Date();
            chart.data.labels.push(now);
            chart.data.datasets.forEach((dataset) => {
                const value = newData[dataset.label];
                dataset.data.push(value !== undefined ? value : null);
            });

            // 只保留最近的 6 筆數據
            if (chart.data.labels.length > 6) {
                chart.data.labels = chart.data.labels.slice(-6);
                chart.data.datasets.forEach((dataset) => {
                    dataset.data = dataset.data.slice(-6);
                });
            }

            chart.update();
            latestData.value = newData;
        };

        const fetchData = async () => {
            try {
                const data = await fetchOpsCounters();
                updateChart(data);
                error.value = null;
            } catch (err) {
                console.error('Error fetching ops counters data:', err);
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
                if (data && data.ops_counters) {
                    updateChart(data.ops_counters);
                }
            });

            socket.on('connect_error', (err) => {
                console.error('WebSocket connection error:', err);
                error.value = 'WebSocket connection error';
            });

            window.addEventListener('resize', () => chart && chart.resize());
        });

        onUnmounted(() => {
            const socket = getSocket();
            socket.off('monitoring_update');
            if (chart) chart.destroy();
            window.removeEventListener('resize', () => chart && chart.resize());
        });

        const formattedLatestData = computed(() => {
            return Object.entries(latestData.value).map(([key, value]) => {
                return `${key}: ${value}`;
            }).join(' | ');
        });

        return { chartCanvas, error, loading, socketConnected, formattedLatestData };
    }
};
</script>

<template>
    <div class="ops-counters-chart">
        <h3>操作計數器</h3>
        <div v-if="loading">Loading...</div>
        <div v-else-if="error">{{ error }}</div>
        <div v-else-if="!socketConnected" class="warning">判斷資源占比</div>
        <canvas ref="chartCanvas"></canvas>
        <div v-if="!loading && !error" class="latest-data">
            Latest data: {{ formattedLatestData }}
        </div>
    </div>
</template>

<style scoped>
.ops-counters-chart {
    background-color: white;
    border-radius: 8px;
    padding: 15px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.warning {
    color: orange;
    margin-bottom: 10px;
}

canvas {
    width: 100% !important;
    height: 300px !important;
}

.latest-data {
    margin-top: 10px;
    font-size: 0.9em;
    color: #666;
}
</style>