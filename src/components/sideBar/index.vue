<template>
  <div>
    <el-container>
      <el-header class="header">
        <el-menu
          :default-active="activeIndex"
          background-color="#071135"
          text-color="#fff"
          active-text-color="#fff"
          class="el-menu-demo"
          mode="horizontal"
        >
          <span index="1" style="float: left; color: cornflowerblue">
            <!-- <i class="el-icon-box"></i> -->
            <span style="font-size: 20px">注塑机生产工艺参数的多粒度智能决策模型系统</span>
          </span>
          <!--            <template slot="title">当前服务器：</template>-->
          <el-dropdown style="float: right; margin-right: 30px">
            <span
              class="el-dropdown-link"
              style="
                float: right;
                color: #fff;
                font-size: 15px;
                cursor: pointer;
              "
              ><i class="el-icon-user"></i>欢迎你，{{ LoginUserName }}</span
            ><i
              style="color: #fff"
              class="el-icon-arrow-down el-icon--right"
            ></i>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item @click.native="toUserCenter"
                >个人信息</el-dropdown-item
              >
              <el-dropdown-item @click.native="updatePass"
                >修改密码</el-dropdown-item
              >
              <el-dropdown-item @click.native="logout"
                >退出登录</el-dropdown-item
              >
            </el-dropdown-menu>
          </el-dropdown>
        </el-menu>
      </el-header>
      <el-container>
        <el-aside width="220px" class="side">
          <el-menu
            :default-active="activeMenu"
            router
            class="el-menu-vertical-demo"
            background-color="#071135"
            text-color="#fff"
            active-text-color="#ffd04b"
            @select="changeMenu()"
            :default-openeds="['modeling', 'modeling1','settings']"
          >
            <!-- 'task1', 'settings', 'task2', 'task3', 'task4' -->
            <el-menu-item index="/dash">
              <i class="el-icon-s-home"></i>
              <span slot="title">首页</span>
            </el-menu-item>
            <el-menu-item index="/dataManage">
              <i class="el-icon-s-data"></i>
              <span slot="title">数据管理</span>
            </el-menu-item>
            <el-menu-item index="/ModelTraining">
              <i class="el-icon-s-help"></i>
              <span slot="title">模型训练</span>
            </el-menu-item>
            <el-submenu index="modeling">
              <template slot="title">
                <i class="el-icon-s-grid"></i>
                <span slot="title">参数调优</span>
              </template>
              <el-menu-item-group>
                <el-menu-item index="/ParameterTuning">
                  <i class="el-icon-open"></i>
                  <span slot="title">单机台单产品</span>
                </el-menu-item>
                <el-tooltip content="正在开发中" placement="right">
                  <el-menu-item index="/UserManage" disabled>
                    <i class="el-icon-open"></i>
                    <span slot="title">多机台单产品</span>
                  </el-menu-item>
                </el-tooltip>
                <el-tooltip content="正在开发中" placement="right">
                  <el-menu-item index="/AdminDataManage" disabled>
                    <i class="el-icon-open"></i>
                    <span slot="title">多机台多产品</span>
                  </el-menu-item>
                </el-tooltip>
              </el-menu-item-group>
            </el-submenu>

            <el-menu-item index="/qualityPredict">
              <i class="el-icon-s-cooperation"></i>
              <span slot="title">质量预测</span>
            </el-menu-item>
            <el-submenu index="modeling1">
              <template slot="title">
                <i class="el-icon-s-platform"></i>
                <span slot="title">知识库管理</span>
              </template>
              <el-menu-item-group>
                <el-menu-item index="/featureManage">
                  <i class="el-icon-data-analysis"></i>
                  <span slot="title">特征分析</span>
                </el-menu-item>
                <el-menu-item index="/TaskManage">
                  <i class="el-icon-document"></i>
                  <span slot="title">模型管理</span>
                </el-menu-item>
                <el-menu-item index="/historyParameter">
                  <i class="el-icon-tickets"></i>
                  <span slot="title">历史调参方案</span>
                </el-menu-item>

              </el-menu-item-group>
            </el-submenu>          
            <el-submenu index="settings" v-if="this.userRole === '0'"> 
              <template slot="title">
                <i class="el-icon-s-operation"></i>
                <span slot="title">系统管理</span>
              </template>
              <el-menu-item-group>
                <el-menu-item index="/UserManage">
                  <i class="el-icon-user-solid"></i>
                  <span slot="title"> 用户管理</span></el-menu-item
                >
                <!-- <el-menu-item index="/sideBar/Inform"
                  ><i class="el-icon-message-solid"></i>
                  <span slot="title">通知管理</span></el-menu-item
                > -->
                <!-- <el-menu-item index="/sideBar/LogManage"
                  ><i class="el-icon-s-order"></i>
                  <span slot="title">日志管理</span></el-menu-item
                > -->
                <!-- <el-menu-item index="/sideBar/SettingDisease"
                  ><i class="el-icon-s-platform"></i>
                  <span slot="title">参数设置</span></el-menu-item
                > -->
              </el-menu-item-group>
            </el-submenu>

            <!-- <div class="menu-footer">
              <el-menu-item index="/sideBar/SoftwareIntro" width="220px">
                <i class="el-icon-s-data"></i>
                <span slot="title"> 软件介绍</span>
              </el-menu-item>
              <el-menu-item index="/sideBar/operation" width="220px">
                <i class="el-icon-s-help"></i
                ><span slot="title"> 操作手册</span></el-menu-item
              >
            </div> -->
          </el-menu>
        </el-aside>
        <el-main class="main">
          <el-alert
            v-if="demoMode"
            class="demo-mode-notice"
            title="纯前端演示模式：业务数据保存在浏览器本地，推荐、预测与训练结果为确定性模拟，仅用于体验前端流程。"
            type="warning"
            :closable="false"
            show-icon
          />
          <!-- <app-main></app-main> -->
          <router-view></router-view>
        </el-main>
      </el-container>

      <el-footer>
        <h2>
          重庆宇海精密制造股份有限公司 @CopyRight 2024-2025 All
          Rights Reserved
        </h2>
      </el-footer>
    </el-container>
  </div>
</template>

<script>
// import { mapMutations } from "vuex";
// import AppMain from "@/components/AppMain";
import { isDemoMode } from "@/demo/demoMode";
export default {
  // components: { AppMain },
  mounted() {
    this.LoginUserName = sessionStorage.getItem("username");
    console.log(
      'sessionStorage.getItem("userrole")',
      sessionStorage.getItem("userrole")
    );
  },
  computed: {
    userRole() {
      return sessionStorage.getItem("userrole");
    },
  },
  data() {
    return {
      demoMode: isDemoMode,
      activeIndex: "0",
      // describVision: false,
      LoginUserName: "",
      activeMenu: this.$route.path,
    };
  },
  watch: {
    $route(to) {
      this.activeMenu = to.path;
    }
  },
  methods: {
    // ...mapMutations("modelTraining", { dfChangeStep: "ChangeStep" }),
    changeMenu() {
      // this.dfChangeStep(1);
    },
    logout() {
      sessionStorage.clear();
      this.$router.replace("/login");
    },
    toUserCenter() {
      this.$router.replace("/userCenter");
    },
    updatePass() {
      this.$router.replace("/updatePassword");
    },
  },
};
</script>

<style scoped>
.el-menu >>> .el-menu-item-group__title {
  padding: 0px;
}

.el-icon-mobile-phone {
  color: white;
}
.el-menu-item {
  height: 50px;
  color: aliceblue;
}

.el-menu-vertical-demo {
  /*解决侧边栏颜色无法撑起整个高度问题*/
  height: 100%;
  /*解决侧边栏凸起问题*/
  border-right: none;
}
.el-menu-vertical-demo span {
  font-size: 14px;
}
.header {
  background-color: #071135;
  color: #333;
  /* text-align: center; */
  line-height: 60px;
}

.side {
  color: #333;
  height: calc(100vh - 81px);
  position: relative;
}

.main {
  height: calc(100vh - 81px);
  /* background-color: #333; */
  /* width: 100vh; */
  overflow: auto;
}
.demo-mode-notice {
  margin-bottom: 14px;
}

.el-footer {
  height: 21px !important;
  font-size: 10px;
  background-color: #a5a5a5bb;
  color: #252525;
  display: flex;
  justify-content: center;
  align-items: center;
}
.menu-footer {
  bottom: 30px;
  position: absolute;
}
</style>
