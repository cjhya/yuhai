const { defineConfig } = require("@vue/cli-service");
module.exports = defineConfig({
  productionSourceMap: false,
  transpileDependencies: true,
  lintOnSave: false,
  devServer: {
    host: "0.0.0.0",
    port: 8080,
    open: true,
    client: {
      overlay: false,
    },
    // 代理配置
    proxy: {
      "/echarts": {
        target: "https://echarts.apache.org/examples", // 我们要代理的地址
        pathRewrite: {
          "^/echarts": "",
        },
      },
      "/api": {
        target: "http://10.16.24.23:8083",
        // target: "http://10.16.48.219:8184", // 我们要代理的地址，实验室地址
        // target: "http://10.16.41.255:8088",
        // target: "http://10.16.97.233:8088",
        // target: "http://localhost:5000",
        // target: "http://10.17.82.194:8083",
        // target:"http://127.0.0.1:5000",
        // 是否跨域 需要设置此值为true 才可以让本地服务代理我们发出请求
        pathRewrite: {
          "^/api": "",
        },
      },
    },
  },
});
