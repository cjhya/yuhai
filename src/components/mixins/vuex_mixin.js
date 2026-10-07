import { mapGetters, mapState } from "vuex";

export default {
  computed: {
    ...mapState({ m_dataList: "dataList" }),
    ...mapGetters({ m_dataDisList: "dataDisList" }),
    m_step() {
      return this.$store.state[this.moduleName].step;
    },
    m_taskName() {
      return this.$store.state[this.moduleName].taskName;
    },
    m_nodeId() {
      return this.$store.state[this.moduleName].nodeId;
    },
    m_principal() {
      return this.$store.state[this.moduleName].principal;
    },
    m_participants() {
      return this.$store.state[this.moduleName].participants;
    },
    m_disease() {
      return this.$store.state[this.moduleName].disease;
    },
    m_comment() {
      return this.$store.state[this.moduleName].comment;
    },
    m_dataset() {
      return this.$store.state[this.moduleName].dataset;
    },
    m_all_features() {
      return this.$store.state[this.moduleName].all_features;
    },
    m_use_features() {
      return this.$store.state[this.moduleName].use_features;
    },
    m_use_labels() {
      return this.$store.state[this.moduleName].use_labels;
    },
    m_known_features() {
      return this.$store.state[this.moduleName].known_features;
    },
    m_target_features() {
      return this.$store.state[this.moduleName].target_features;
    },
    m_algorithms() {
      return this.$store.state[this.moduleName].algorithms;
    },
    m_SF_DRMB() {
      return this.$store.state[this.moduleName].SF_DRMB;
    },
    m_DQN() {
      return this.$store.state[this.moduleName].DQN;
    },
    m_SVM() {
      return this.$store.state[this.moduleName].SVM;
    },
    m_KNN() {
      return this.$store.state[this.moduleName].KNN;
    },
    m_models() {
      return this.$store.state[this.moduleName].models;
    },

    m_result() {
      return this.$store.state[this.moduleName].result;
    },

    m_res(){
      return this.$store.state[this.moduleName].res;
    },

    // 模型训练
    m_train_model() {
      return this.$store.state[this.moduleName].train_model;
    },
    m_training_workflow() {
      return this.$store.state[this.moduleName].workflow;
    },

    // 风险预测
    m_predict_features() {
      return this.$store.state[this.moduleName].predict_features;
    },
    m_patient_form() {
      return this.$store.state[this.moduleName].patient_form;
    },
    m_personForm() {
      return this.$store.state[this.moduleName].personForm;
    },
    m_predict_task_name() {
      return this.$store.state[this.moduleName].predict_task_name;
    },
    m_predict_model_name() {
      return this.$store.state[this.moduleName].predict_model_name;
    },
    m_predict_dataset() {
      return this.$store.state[this.moduleName].predict_dataset;
    },
    m_predValue() {
      return this.$store.state[this.moduleName].predValue;
    },
  },
  methods: {
    m_changeStep(newStep) {
      this.$store.commit(`${this.moduleName}/ChangeStep`, newStep);
    },
    m_transitionTraining(event) {
      return this.$store.dispatch(`${this.moduleName}/transitionTraining`, event);
    },

    m_changeTaskInfo(newValue) {
      this.$store.commit(`${this.moduleName}/ChangeTaskInfo`, newValue);
    },
    m_SF_DRMB_update(newdata) {
      this.$store.commit(`${this.moduleName}/SF_DRMB_update`, newdata);
    },
    m_DQN_update(newdata) {
      this.$store.commit(`${this.moduleName}/DQN_update`, newdata);
    },
    m_SVM_update(newdata) {
      this.$store.commit(`${this.moduleName}/SVM_update`, newdata);
    },
    m_KNN_update(newdata) {
      this.$store.commit(`${this.moduleName}/KNN_update`, newdata);
    },

    m_models_update(payload) {
      this.$store.commit(`${this.moduleName}/models_update`, payload);
    },

    m_models_update_res(payload) {
      this.$store.commit(`${this.moduleName}/models_update_res`, payload);
    },

    m_reset_state() {
      this.$store.commit(`${this.moduleName}/reset_state`);
    },

    m_reset_state_from_datasets() {
      this.$store.commit(`${this.moduleName}/reset_state_from_datasets`);
    },
    m_reset_train_select_data(){
      this.$store.commit(`${this.moduleName}/reset_train_select_data`);
    },
    m_reset_state_train_model(){
      this.$store.commit(`${this.moduleName}/reset_state_train_model`);
    },
    // 更改模型训练的字典
    m_changeModelTrain(newValue) {
      this.$store.commit(`${this.moduleName}/ChangeModelTrain`, newValue);
    },
  },
};
