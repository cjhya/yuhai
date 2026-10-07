<template>
  <div id="app"><router-view /></div>
</template>

<style lang="scss">
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}
* {
  margin: 0;
  padding: 0;
  border: 0;
}
html,
body {
  height: 100%;
}
.explain {
  color: red;
  font-size: 12px;
}
.whiteItem .el-form-item__label {
  color: #fff;
}
.title {
  margin: 10px auto;
  font-size: 26px;
  font-weight: bold;
  text-align: center;
}
.caret-wrapper {
  padding: 0;
}
.InfoData {
  width: 100%;
  margin: 10px auto;
  padding: 0;
}
.el-table {
  ::v-deep th,
  ::v-deep td {
    padding: 0;
  }
}
</style>
