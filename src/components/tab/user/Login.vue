<template>
  <div class="myMain">
    <!-- <div class="topContainer">
      <div class="mainRight1">
        <img
          src="@/assets/cqupt.png"
          style="height: 120px; width: 500px; margin-left: 20px"
        />
      </div>
    </div> -->
    
    <div class="mainContainer">
      <div class="leftContainer">
        <h1 style = "display: block; color: white;
                    font-size: 40px; letter-spacing: 4px;
                    margin-top: -5%;display: flex; ">注塑机生产工艺参数的多粒度智能决策模型系统</h1>
      </div>
      <div class="bottomContainer">

        <!-- <div class="topContent" style="width: 100%;margin-top: 20%; margin-right: 10%; color: white;">
          <h1
            style="
              font-size: 40px;
              font-weight: bold;
              color: white;
              text-shadow: 10px 10px 10px rgba(0, 0, 0, 0.3);
              

            "
          >
          注塑机生产工艺参数的多粒度智能决策模型系统
          </h1>
        </div> -->
        <div class="loginContainer">
          <div class="myForm">
            <!-- </div> -->

            <el-form
              element-loading-text="正在登陆..."
              element-loading-spinner="el-icon-loading"
              element-loading-background="rgba(0, 0, 0, 0.8)"
              ref="loginForm"
              :model="loginForm"
              :rules="rules"
              style="font-size: 30px"
            >
              <div style="display: flex; flex-direction: row">
                <h6 class="loginTitle">用户登陆</h6>
                <!-- <el-text style="font-size: 12px">UserLogin</el-text> -->
              </div>
              <el-form-item prop="username">
                <el-input
                  type="text"
                  auto-complete="false"
                  v-model="loginForm.username"
                  placeholder="请输入用户名"
                ></el-input>
              </el-form-item>
              <el-form-item prop="password">
                <el-input
                  type="password"
                  auto-complete="false"
                  v-model="loginForm.password"
                  placeholder="请输入密码"
                ></el-input>
              </el-form-item>
              <el-form-item prop="code">
                <el-input
                  type="text"
                  auto-complete="false"
                  v-model="loginForm.code"
                  placeholder="点击图片更换验证码"
                  style="width: 250px; margin-right: 5px"
                ></el-input>
                <img :src="captchaUrl" @click="updatecaptcha" />
              </el-form-item>
              <div
                style="
                  display: flex;
                  justify-content: space-between;
                  margin-top: -15px;
                "
              >
                <el-button type="text" @click="forgetPsw">忘记密码</el-button>
                <el-button type="text" @click="register">注册账号</el-button>
              </div>
              <el-button
                type="primary"
                style="
                  width: 100%;
                  font-size: 20px;
                  margin-top: 20px;
                  background: #669900;
                "
                @click="submitlogin"
                >登录</el-button
              >
              <!-- <el-button
                type="danger"
                style="
                  width: 100%;
                  margin-top: 20px;
                  margin-left: 0px;
                  font-size: 20px;
                "
                @click="backToPlatform"
                >退出软件</el-button
              > -->
            </el-form>
          </div>
        </div>
      </div>
    </div>
    <!-- <div class="bottom"></div> -->
  </div>
</template>

<script>
import { getRequest, postRequest } from "@/utils/api";
// import { mapActions } from "vuex";
export default {
  name: "Login",

  data() {
    return {
      captchaUrl: `/api/common/kaptcha?timestamp=${new Date().getTime()}`,
      loginForm: {
        username: "",
        password: "",
        code: "",
      },
      loading: false,
      checked: true,
      rules: {
        username: [
          { required: true, message: "请输入用户名", trigger: "blur" },
        ],
        password: [{ required: true, message: "请输入密码", trigger: "blur" }],
        code: [{ required: true, message: "请输入验证码", trigger: "blur" }],
      },
      selectedNotification: {},
      dialogVisible: false,
      dialogVisible2: false,
      notificationList: [],
      notification: "",
    };
  },
  created() {
    // this.getNotification();
  },
  mounted() {
    this.updatecaptcha();
  },
  methods: {
    shouldScroll(title) {
      // Check if the title length exceeds 20 characters
      const tempDiv = document.createElement("div");
      tempDiv.style.position = "absolute";

      tempDiv.style.visibility = "hidden";
      tempDiv.innerHTML = title;
      document.body.appendChild(tempDiv);
      const width = tempDiv.offsetWidth;
      document.body.removeChild(tempDiv);

      // Check if the width exceeds 180px
      return width > 300;
    },
    showDetails(item) {
      this.selectedNotification = item;
      this.dialogVisible = true;
    },
    convertToBeijingTime(isoString) {
      // 解析 ISO 字符串为 Date 对象
      const date = new Date(isoString);

      // 调整时区到北京时间，UTC+8
      const beijingTime = new Date(date.getTime() + 8 * 60 * 60 * 1000); // 添加8小时的毫秒数

      // 使用 Intl.DateTimeFormat 格式化输出
      const formatter = new Intl.DateTimeFormat("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: "Asia/Shanghai",
      });

      return formatter
        .format(beijingTime)
        .replace(/\//g, "-")
        .replace(", ", " ");
    },
    getNotification() {
      getRequest("notice/queryNotices").then((res) => {
        if (res) {
          const temp = res.map((item) => ({
            ...item,
            updateTime: this.convertToBeijingTime(item.updateTime),
          }));
          this.notification = temp;
        }
      });
    },
    handleClose(done) {
      console.log("close");
      this.dialogVisible = false;
      done(); // 必须调用 done()，否则对话框不会关闭
    },
    updatecaptcha() {
      this.captchaUrl = `/api/common/kaptcha?timestamp=${new Date().getTime()}`;
    },

    submitlogin() {
      this.$refs.loginForm.validate((valid) => {
        if (valid) {
          this.loading = true;
          postRequest(`user/login`, this.loginForm).then((resp) => {
            if (resp) {
            // if (1 == 1) {
              this.loading = false;
              console.log(resp);
              if (resp.code == "200") {
              // if (1 == 1) {
                if (resp.data.userStatus === "1") {
                // if (1 === 1) {
                  console.log("in");
                  sessionStorage.setItem("username", resp.data.username);
                  sessionStorage.setItem("userid", resp.data.uid);
                  sessionStorage.setItem("userrole", resp.data.role);
                  sessionStorage.setItem("token", resp.msg);

                  this.$router.push("/dash");
                  this.$message.success("登录成功");
                }
              } else {
                this.$message.warning(`${resp.msg}`);
                this.updatecaptcha();
              }
            } else {
              this.$message.error("用户不存在或者密码错误");
            }
          });
        } else {
          this.$message.error("请输入所有字段");
          return false;
        }
      });
    },
    moreNotice() {
      this.dialogVisible2 = true;
    },
    register() {
      this.$router.push("/register");
    },
    forgetPsw() {
      this.$router.push("/forget");
    },
    // backToPlatform() {
    //   window.location.href = "http://10.16.48.219:8000";
    // },
  },
};
</script>

<style scoped>
* {
  box-sizing: border-box;
}
li {
  list-style-type: none; /* 去除列表项前的标记 */
  margin: 0; /* 去除列表项的默认外边距 */
  padding: 0; /* 去除列表项的默认内边距 */
}
.myMain {
  /* height: 10%; */
  width: 100%;
  height: 100vh;
  /* margin-top: 200px; */
  overflow: hidden;
  background: url("@/assets/login_bg.png") no-repeat;
  background-size: 100% 100%;
}
.mainContainer {
  
  background-size: cover;
  background-position: center; /* 背景图像在容器中水平和垂直居中 */
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-direction: column;
  /* padding-right: 120px; */
  height: 100%;
}

.topContainer {
  /* flex: 0.2; */
  padding: 0px;
  width: 100%;
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  flex-direction: column;
  background-color: #fff;
  height: 15%;
}
.topContent {
  
  
 
}
.bottom {
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  flex-direction: column;
  background-color: #fff;
  height: 20%;
  width: 100%;
  margin: 0;
  border-radius: 0;
  border: 0;
}

.bottomContainer {
  flex: 0.9;
  display: flex;
  z-index: 2;
  /* opacity: 0.9; */
  align-items: flex-end;
  justify-content: center;
  flex-direction: column;
  /* position: fixed;
  top: 10%; 
  left: 20%; 
  transform: translate(80%, -10%); */
}

.notificationDiv {
  border-radius: 15px;
  background-clip: padding-box;
  /* margin: 20px 10px; */
  margin-bottom: 150px;
  width: 700px;
  height: 450px;
  background: white;
  border: 1px solid #eaeaee;
  box-shadow: 0 0 25px #cac6c6;
  display: flex;
  align-items: center;
  flex-direction: column;
  margin-right: 40px;

}

.notification_title {
  height: 50px;
  width: 100%;
  margin-bottom: 40px;
  display: flex;
  justify-content: space-between;
  align-content: center;
  padding-left: 20px;
  padding-right: 20px;
}

.notification_container {
  width: 100%;
  height: 400px;
  overflow: hidden;
  display: flex; /* 使用 Flexbox */
  align-items: center; /* 垂直居中子元素 */
  flex-direction: column;
}

.notification_content_title {
  padding-left: 20px;
  white-space: nowrap;
  overflow: hidden;
  cursor: pointer;
  max-width: 400px;
}

.notification_content_title:hover .scroll-text {
  animation-play-state: running;
}

.loginContainer {
  border-radius: 15px;
  background-clip: padding-box;
  /* margin: 20px 10px; */
  /* margin-bottom: 150px; */
  width: 350px;
  height: 400px;
  background: white;
  border: 1px solid blue;
  box-shadow: 0 0 25px #cac6c6;
  display: flex;
  align-content: center;
  align-items: center;
  margin-top: -20%;
  margin-bottom: 60%;
  margin-right: 70%;

}

.myForm {
  padding-left: 30px;
  padding-right: 30px;
}
.myForm img {
  cursor: pointer;
}

.loginTitle {
  margin: 0px auto 30px auto;
  text-align: left;
}

.selectedNotificationTitle {
  font-size: 30px;
  font-weight: bold;
  display: flex;
  justify-content: center;
}
.selectedNotificationContent {
  font-size: 17px;
  margin-top: 20px;
  display: flex;
  justify-content: center;
}
.leftContainer {
  flex: 0.4; /* 左侧盒子的放大比例为1 */
  padding: 20px; /* 内边距 */
  display: flex;
  justify-content: center;
  width: 100%;
  /* margin-right: 25%; */
  margin-top: -1%;
}
.rightContainer {
  flex: 0.6; /* 右侧盒子的放大比例为2 */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 30px;
}

.banner {
  height: 100px;
  width: 100%;
}

/* .loginDiv {
  position: absolute;
  right: 80px;
  margin-top: 40px;
} */

.mainRight1 {
  /* position: absolute;
  top: 8px;
  left: 100px; */
  display: flex;
  align-items: center;
  vertical-align: bottom;
}

.mainRight1 h1 {
  display: block;
  color: white;
  font-size: 40px;
  letter-spacing: 4px;
  margin-top: -10px;
}
.mainRight {
  position: absolute;
  top: 8px;
  left: 100px;
  display: flex;
  align-items: center;
  flex-direction: column;
}

.mainRight h1 {
  display: block;
  color: white;
  font-size: 40px;
  letter-spacing: 4px;
  margin-top: -10px;
}
.mainImg {
  display: block;
  position: absolute;
  left: -480px;
  top: -200px;
}

.mainImg {
  display: flex;
  z-index: 1;
}

.loginRemember {
  text-align: left;
  margin: 0px 0px 15px 0px;
}
.el-form-item__content {
  display: flex;
  align-items: center;
}

.notification_container {
  width: 100%;
  height: 100px;
  overflow: hidden;
  display: flex; 
  align-items: center; 
  flex-direction: column;
}
.collapse {
  overflow: auto;
  flex: 0.75;
  width: 100%;
}

@keyframes scroll {
  0% {
    transform: translateX(500px);
  }
  100% {
    transform: translateX(-100%);
  }
}

.scroll-text {
  display: inline-block;
  overflow: hidden;
  white-space: nowrap;
  font-weight: 500;
  animation: scroll 20s linear infinite;
  text-decoration: underline; /* 添加下划线 */
  text-underline-offset: 3px;
  cursor: pointer;
}

.notification_container {
  width: 100%;
  height: 400px;
  overflow: hidden;
  display: flex; /* 使用 Flexbox */
  align-items: center; /* 垂直居中子元素 */
  flex-direction: column;
}

.el-divider--horizontal {
  display: block;
  height: 1px;
  width: 100%;
  margin: 18px 0;
}
</style>
