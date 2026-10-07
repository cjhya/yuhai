import request from "@/utils/requestAlg";
import { toPositiveNumber } from "@/utils/http";

export const parameterRecommend = (pro, alg, ra, p_alg, data, config = {}) => {
  return request.post(`/recommend/${pro}/${alg}/${ra}/${p_alg}`, {
    data,
  }, {
    ...config,
    validateData: value => Boolean(
      value &&
      typeof value === "object" &&
      typeof value.recommend_data === "string" &&
      typeof value.recommend_label === "string"
    ),
  });
};

export const predictQuality = (pro, alg, data, config = {}) => {
  return request.post(`/predict/${pro}/${alg}`, data, {
    ...config,
    validateData: value => typeof value === "string",
  });
};

export const trainModel = (productSeries, algorithm, config = {}) => {
  return request.get(`/train/${productSeries}/${algorithm}`, {
    timeout: toPositiveNumber(process.env.VUE_APP_TRAIN_API_TIMEOUT, 600000),
    ...config,
    validateData: value => Boolean(value && typeof value === "object"),
  });
};

