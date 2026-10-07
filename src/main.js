import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";
import ElementUI from "element-ui";
import * as echarts from "echarts";
import "element-ui/lib/theme-chalk/index.css";
import request from "@/utils/request";
import { isDemoMode } from "@/demo/demoMode";

if (isDemoMode && typeof window !== "undefined") {
  if (!window.sessionStorage.getItem("username")) {
    window.sessionStorage.setItem("username", "演示用户");
  }
  if (!window.sessionStorage.getItem("userid")) {
    window.sessionStorage.setItem("userid", "demo-user");
  }
  if (!window.sessionStorage.getItem("userrole")) {
    window.sessionStorage.setItem("userrole", "1");
  }
}

Vue.prototype.$echarts = echarts;
Vue.prototype.$axios = request;
Vue.config.productionTip = false;

Vue.use(ElementUI);
new Vue({
  router,
  store,
  render: (h) => h(App),
}).$mount("#app");
