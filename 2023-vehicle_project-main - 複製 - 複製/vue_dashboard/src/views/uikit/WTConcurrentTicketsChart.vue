<script>
import { ref, onMounted, nextTick, watch } from 'vue';

export default {
    name: 'WTConcurrentTicketsChart',
    props: {
        type: {
            type: String,
            required: true,
            validator: (value) => ['Read', 'Write'].includes(value)
        },
        data: {
            type: Object,
            default: () => ({})
        }
    },
    setup(props) {
        const latestStats = ref({});
        const error = ref(null);
        const loading = ref(true);
        const dataPoints = ref([]); // 存儲單一最新數據點

        const updateData = () => {
            if (dataPoints.value.length > 0) {
                const latest = dataPoints.value[dataPoints.value.length - 1];
                latestStats.value = {
                    available: latest.value,
                    total: props.data.totalTickets || 0
                };
            }
        };

        watch(
            () => props.data,
            (newData) => {
                if (newData && typeof newData.available === 'number') {
                    const now = new Date();
                    dataPoints.value = [{ time: now, value: newData.available }]; // 每次只保留最新的一筆數據

                    nextTick(() => {
                        updateData();
                        loading.value = false;
                    });
                } else {
                    console.error('Received invalid data format or data is undefined');
                }
            },
            { deep: true, immediate: true }
        );

        onMounted(() => {
            loading.value = false;
            if (props.data && typeof props.data.available === 'number') {
                const now = new Date();
                dataPoints.value = [{ time: now, value: props.data.available }]; // 初始化時也只保留一筆數據
                updateData();
            }
        });

        return { latestStats, error, loading, dataPoints };
    }
};
</script>

<template>
    <div class="wt-concurrent-tickets-chart">
        <h3>WT - {{ type }} 併發請求監控</h3>
        <div v-if="loading">Loading...</div>
        <div v-else-if="error">{{ error }}</div>
        <div v-else>
            <div v-if="dataPoints.length > 0">
                <p>最新資料：</p>
                <ul>
                    <li>
                        時間: {{ dataPoints[0].time.toLocaleString() }} - 可用數量: {{ dataPoints[0].value }}
                    </li>
                </ul>
            </div>
            <div v-else>
                <p>目前無數據可顯示。</p>
            </div>
        </div>
        <div class="stats-summary">
            <div class="stat-item">
                <span class="category">{{ type }}:</span>
                <span class="value">可用數量: {{ latestStats.available }}, 總數: {{ latestStats.total }}</span>
            </div>
        </div>
    </div>
</template>

<style scoped>
.wt-concurrent-tickets-chart {
    background-color: white;
    border-radius: 8px;
    padding: 15px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

h3 {
    margin-top: 0;
    margin-bottom: 15px;
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
</style>