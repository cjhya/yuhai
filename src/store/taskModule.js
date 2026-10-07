import {
  TRAINING_EVENT,
  createInitialTrainingWorkflow,
  trainingPhaseToStep,
  transitionTrainingWorkflow,
} from "@/domain/training/trainingWorkflow";
import {
  clearTrainingDraft,
  loadTrainingDraft,
} from "@/domain/training/trainingDraftStorage";
import { getConfiguredTrainingJobMode } from "@/api/trainingJob";

function createDefaultTrainModel() {
  return {
    taskName: "",
    responsiber: "",
    productSeries: "",
    remark: "",
    createTime: "",
    dataSet: "",
    dataName: "",
    dataImportId: "",
    dataSetMeta: null,
    algorithm: {
      selected_algorithm: "",
      algorithm_infos: {},
    },
    result: {
      mape_val: 0,
    },
  };
}

function mergeTrainModel(value = {}) {
  const defaults = createDefaultTrainModel();
  return {
    ...defaults,
    ...value,
    algorithm: {
      ...defaults.algorithm,
      ...(value.algorithm || {}),
    },
    result: {
      ...defaults.result,
      ...(value.result || {}),
    },
    dataSet: "",
    dataImportId: "",
  };
}

export default {
  namespaced: true,
  state() {
    return {
      step: 1,
      workflow: createInitialTrainingWorkflow({
        mode: getConfiguredTrainingJobMode(),
      }),
      taskName: "",
      nodeId: "",
      principal: "",
      productSeries: "",
      remark: "",
      disease: "",
      dataset: "",
      all_features: [],
      use_features: [],
      use_labels: [],
      known_features: [],
      target_features: [],
      algorithms: [],
      personForm: {},
      models: [
        {
          name: "dqn",
          model_type: "dl",
          is_select: true,
          params: {
            reward: 1,
            epoch: 100,
            gamma: 0.8,
            learning_rate: 0.01,
          },
          res: {},
        },
      ],
      DQN: {
        reward: 1,
        epoch: 100,
        gamma: 0.8,
        learning_rate: 0.01,
      },

      result: [],
      // 模型训练
      train_model: createDefaultTrainModel(),
    };
  },
  getters: {
    trainingPhase(state) {
      return state.workflow.phase;
    },
    activeTrainingJob(state) {
      return state.workflow.job;
    },
  },
  actions: {
    transitionTraining({ state, commit }, event) {
      const nextWorkflow = transitionTrainingWorkflow(state.workflow, event);
      if (nextWorkflow !== state.workflow) {
        commit("SetTrainingWorkflow", nextWorkflow);
      }
      return nextWorkflow;
    },
    restoreTrainingDraft({ state, commit }) {
      if (state.workflow.revision > 0) return null;
      const draft = loadTrainingDraft({ mode: getConfiguredTrainingJobMode() });
      if (!draft) return null;
      commit("HydrateTrainingDraft", draft);
      return draft;
    },
    resetTraining({ state, commit }) {
      commit("ResetTrainingState", { mode: state.workflow.mode });
      clearTrainingDraft();
    },
    invalidateDataset({ dispatch }, error) {
      return dispatch("transitionTraining", {
        type: TRAINING_EVENT.INVALIDATE_DATASET,
        payload: error ? { error } : {},
      });
    },
  },
  mutations: {
    ChangeStep(state, step) {
      const expectedStep = trainingPhaseToStep(state.workflow.phase);
      if (step !== expectedStep) {
        throw new Error("训练步骤只能通过工作流事件迁移");
      }
      state.step = expectedStep;
    },
    SetTrainingWorkflow(state, workflow) {
      state.workflow = workflow;
      state.step = trainingPhaseToStep(workflow.phase);
    },
    HydrateTrainingDraft(state, draft) {
      state.workflow = draft.workflow;
      state.train_model = mergeTrainModel(draft.trainModel);
      state.step = trainingPhaseToStep(draft.workflow.phase);
    },
    ResetTrainingState(state, payload = {}) {
      state.workflow = createInitialTrainingWorkflow({
        mode: payload.mode || getConfiguredTrainingJobMode(),
      });
      state.train_model = createDefaultTrainModel();
      state.step = 1;
    },
    ChangeTaskInfo(state, newInfo) {
      Object.assign(state, newInfo);
    },
    // ChangeTaskInfo没法深拷贝所以需要单独的函数处理
    SF_DRMB_update(state, newdata) {
      state.SF_DRMB = Object.assign(state.SF_DRMB, newdata);
    },
    DQN_update(state, newdata) {
      state.DQN = Object.assign(state.DQN, newdata);
    },
    SVM_update(state, newdata) {
      state.SVM = Object.assign(state.SVM, newdata);
    },
    KNN_update(state, newdata) {
      state.KNN = Object.assign(state.KNN, newdata);
    },

    models_update(state, payload) {
      let name = payload.name;
      let is_select = payload.is_select;
      let newdata = payload.newdata;
      let all_models = state.models;
      console.log("all_models", all_models, " name:", name);
      all_models.forEach((model, index) => {
        if (model.name === name) {
          console.log("all true");
          model.params = Object.assign(state.models[index].params, newdata);
          model.is_select = is_select;
          console.log("task", model.params, "\n", newdata);
        }
      });
    },

    models_update_res(state, payload) {
      let name = payload.name;
      let res = payload.res;
      let all_models = state.models;
      console.log("all_models", all_models, " name:", name);
      all_models.forEach((model, index) => {
        if (model.name === name) {
          console.log("all true_res");
          model.res = Object.assign(state.models[index].res, res);
          console.log("task_res", model.params, "\n", res);
        }
      });
    },

    reset_state(state) {
      let defaultValue = {
        step: 1,
        taskName: "",
        nodeId: "",
        principal: "",
        participants: "",
        dataset: "",
        all_features: [],
        use_features: [],
        use_labels: [],
        known_features: [],
        target_features: [],
        algorithms: [],
        models: [
          {
            name: "dqn",
            model_type: "dl",
            is_select: true,
            params: {
              reward: 1,
              epoch: 100,
              gamma: 0.8,
              learning_rate: 0.01,
            },
            res: {},
          },
          {
            name: "svm",
            model_type: "ml",
            is_select: false,
            params: {
              kernel: "linear",
              random_state: 42,
              cv: 5,
            },
            res: {},
          },
          {
            name: "knn",
            model_type: "ml",
            is_select: false,
            params: {
              random_state: 42,
              cv: 10,
              K: 3,
            },
            res: {},
          },
        ],
        result: [],
      };

      Object.assign(state, defaultValue);
    },
    reset_state_train_model(state) {
      Object.assign(state.train_model, createDefaultTrainModel());
    },
    // 更改模型训练的字典
    ChangeModelTrain(state, newInfo) {
      Object.assign(state.train_model, newInfo);
    },
    reset_train_select_data(state) {
      state.train_model.algorithm = {
        selected_algorithm: "",
        algorithm_infos: {},
      };
      state.train_model.result = { mape_val: 0 };
    },
  },
};
