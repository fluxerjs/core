<template>
  <div class="version-layout">
    <router-view />
  </div>
</template>

<style scoped>
.version-layout {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: auto;
}
</style>
