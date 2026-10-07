export default [
  {
    modelname: "ro",
    modelFullName: "RO(随机过采样预测模型)",
    isSelect: false,
    introduction:
      "随机过采样预测模型，一种简单的过采样方法，通过随机复制少数类样本平衡数据集。优点是实现简单，但可能导致模型过拟合（重复样本降低泛化能力）。",
    params: {
      kernel: "linear",
      random_state: 42,
      cv: 5,
    },
  },
  {
    modelname: "smoter",
    modelFullName: "SMOTER(​用于回归的合成少数过采样预测模型)",
    isSelect: false,
    introduction:
      "用于回归的合成少数过采样预测模型，专为回归任务设计的改进版SMOTE，针对连续型目标变量生成合成样本。通过插值少数类样本的邻近点缓解类别不平衡，适用于回归中的不平衡数据场景。",
    params: {
      kernel: "linear",
      random_state: 42,
      cv: 5,
    },
  },
  {
    modelname: "smogn",
    modelFullName: "SMOGN(结合高斯噪声的合成少数过采样预测模型)",
    isSelect: false,
    introduction:
      "结合高斯噪声的合成少数过采样预测模型，用于回归任务。在少数类区域生成新样本时加入噪声扰动，平衡数据分布的同时提升模型鲁棒性，尤其适合高噪声或复杂分布的数据集。",
    params: {
      kernel: "linear",
      random_state: 42,
      cv: 5,
    },
  },
  {
    modelname: "gsogb-smoter",
    modelFullName: "GSOGB-SMOTER(基于网格自组织粒球模型的不平衡回归过采样预测模型)",
    isSelect: false,
    introduction:
      "基于网格自组织粒球模型的不平衡回归过采样预测模型，基于改进的网格自组织粒球模型，降低样本规模，结合样本集合的分布，在邻域范围内自适应地合成少数类样本，常用于处理大规模样本集合。",
    params: {
      kernel: "linear",
      random_state: 42,
      cv: 5,
    },
  },
];
