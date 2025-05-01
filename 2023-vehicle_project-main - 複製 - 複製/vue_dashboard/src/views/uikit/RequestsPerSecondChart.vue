<script>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue';
import Chart from 'chart.js/auto';
import { fetchRequestsPerSecond } from '@/service/api';
import { getSocket } from '@/service/socket';

export default {
    name: 'RequestsPerSecondChart',
    setup() {
        const chartCanvas = ref(null);
        let chart = null;
        const error = ref(null);
        const loading = ref(true);
        const socketConnected = ref(false);
        const latestData = ref({ reads: 0, writes: 0 });

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
                        datasets: [
                            {
                                label: 'Reads/s',
                                data: [],
                                borderColor: 'rgb(75, 192, 192)',
                                tension: 0.1
                            },
                            {
                                label: 'Writes/s',
                                data: [],
                                borderColor: 'rgb(255, 99, 132)',
                                tension: 0.1
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        scales: {
                            x: {
                                type: 'time',
                                time: {
                                    unit: 'second'
                                }
                            },
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Requests/s'
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
            chart.data.datasets[0].data.push(newData.reads);
            chart.data.datasets[1].data.push(newData.writes);

            // 限制數據點數量為 6
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
                const data = await fetchRequestsPerSecond();
                updateChart(data);
                error.value = null;
            } catch (err) {
                console.error('Error fetching requests per second data:', err);
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
                if (data && data.requests_per_second) {
                    updateChart(data.requests_per_second);
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
            return `Reads/s: ${latestData.value.reads} | Writes/s: ${latestData.value.writes}`;
        });

        return { chartCanvas, error, loading, socketConnected, formattedLatestData };
    }
};
</script>

<template>
    <div class="requests-per-second-chart">
        <h3>請求流量分析</h3>
        <div v-if="loading">Loading...</div>
        <div v-else-if="error">{{ error }}</div>
        <div v-else-if="!socketConnected" class="warning">反映讀寫壓力</div>
        <canvas ref="chartCanvas"></canvas>
        <div v-if="!loading && !error" class="latest-data">
            Latest data: {{ formattedLatestData }}
        </div>
    </div>
</template>

<style scoped>
.requests-per-second-chart {
    background-color: white;
    border-radius: 8px;
    padding: 15px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.warning {
    color: orange;
    margin-bottom: 10px;
}

.latest-data {
    margin-top: 10px;
    font-size: 0.9em;
    color: #666;
}
</style>