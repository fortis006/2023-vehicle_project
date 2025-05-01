<script setup>
import { ref } from 'vue';

import AppMenuItem from './AppMenuItem.vue';

const model = ref([
    {
        label: 'Home',
        items: [{ label: 'Overiew', icon: 'pi pi-fw pi-home', to: '/' }]
    },
    {
        label: 'Raw Data',
        items: [{ label: 'Dashboard', icon: 'pi pi-fw pi-id-card', to: '/uikit/RawData' }]
    },
    {
        label: 'Forcast',
        items: [
        { label: 'Compare' , icon: 'pi pi-fw pi-chart-bar', items: [
            { label: 'Vehicle1', icon: 'pi pi-fw pi-chart-bar', to: '/uikit/charts' },
            { label: 'Vehicle2', icon: 'pi pi-fw pi-chart-line', to: '/uikit/charts' },
            { label: 'Vehicle3', icon: 'pi pi-fw pi-chart-pie', to: '/uikit/charts' }
        ]}
        ]
    },
    {
        label: 'JSON Server',
        items: [{ label: 'Fetch api', icon: 'pi pi-fw pi-book', to: '/uikit/Fetch' }]
    }
]);
</script>

<template>  <!--渲染側邊菜單-->
    <ul class="layout-menu">
        <template v-for="(item, i) in model" :key="item">
            <app-menu-item v-if="!item.separator" :item="item" :index="i"></app-menu-item>
            <li v-if="item.separator" class="menu-separator"></li>
        </template>
        <li>
            <img src="" alt="logo" class="w-full mt-3" />
        </li>
    </ul>
</template>

<style lang="scss" scoped></style>
