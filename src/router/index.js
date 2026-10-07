import Vue from "vue";
import VueRouter from "vue-router";

//用户登录
import Login from "@/components/tab/user/Login.vue";
import forget from "@/components/tab/user/forget.vue";
import register from "@/components/tab/user/register.vue";
import updatePassword from "@/components/tab/user/updatePassword.vue";
import userCenter from "@/components/tab/user/userCenter.vue";

import sideBar from "@/components/sideBar/index.vue";
import dash from "@/views/dash/index.vue";
import TaskManage from "@/components/tab/createModel/model_manage/TaskManage.vue";
import featureManage from "@/components/tab/featureManage.vue";

import ModelTraining from "@/components/tab/createModel/model_training/ModelTraining.vue";

import ParameterTuning from "@/views/ParameterTuning.vue";
import qualityPredict from "@/views/qualityPredict.vue";
import dataManage from "@/views/dataManage.vue";
import historyParameter from "@/views/historyParameter.vue";
import TaskCheck from "@/components/tab/createModel/model_manage/TaskCheck.vue";

// 系统管理的几个功能模块
import UserManage from "@/components/tab/sysManage/UserManage.vue";

Vue.use(VueRouter);

const routes = [
  {
    path: "/login",
    name: "login",
    component: Login,
  },
  {
    path: "/register",
    name: "register",
    component: register,
  },
  {
    path: "/forget",
    name: "forget",
    component: forget,
  },
  //个人中心
  {
    path: "/userCenter",
    name: "userCenter",
    component: userCenter,
    meta: { roles: ["1", "0"] },
  },
  //修改密码
  {
    path: "/updatePassword",
    name: "updatePassword",
    component: updatePassword,
    meta: { roles: ["1", "0"] },
  },

  {
    path: "/",
    name: "sideBar",
    redirect: "/dash",
    component: sideBar,
    children: [
      {
        path: "dash",
        name: "dash",
        component: dash,
        meta: { roles: ["1", "0"] },
      },
      {
        path: "ParameterTuning",
        name: "ParameterTuning",
        component: ParameterTuning,
        meta: { roles: ["1", "0"] },
      },
      {
        path: "dataManage",
        name: "dataManage",
        component: dataManage,
        meta: { roles: ["1", "0"] },
      },
      {
        path: "historyParameter",
        name: "historyParameter",
        component: historyParameter,
        meta: { roles: ["1", "0"] },
      },
      {
        path: "featureManage",
        name: "featureManage",
        component: featureManage,
        meta: { roles: ["1", "0"] },
      },
      {
        path: "qualityPredict",
        name: "qualityPredict",
        component: qualityPredict,
        meta: { roles: ["1", "0"] },
      },
      {
        path: "TaskManage",
        name: "TaskManage",
        component: TaskManage,
        meta: { roles: ["1", "0"] },
      },
      {
        path: "ModelTraining",
        name: "ModelTraining",
        component: ModelTraining,
        meta: { roles: ["1", "0"] },
      },
      {
        path: "TaskCheck/:id",
        name: "TaskCheck",
        component: TaskCheck,
        meta: { roles: ["1", "0"] },
      },
      {
        path: "UserManage",
        name: "UserManage",
        component: UserManage,
        meta: { roles: ["0"] },
      },
    ],
  },
];

const router = new VueRouter({
  routes,
});

export default router;
