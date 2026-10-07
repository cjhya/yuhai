import request from "@/utils/request";

export const addParameterHistory = (parameter) => {
  return request.post("/parameterHistory", { ...parameter });
};

export const delParameterHistory = (id) => {
  return request.delete(`/parameterHistory/${id}`);
};

export const getParameterHistory = () => {
  return request.get("/parameterHistory/list");
};

export const getPageParameterHistory = (page = 1, pageSize = 10) => {
  return request.get("/parameterHistory/page", {
    params: {
      page,
      pageSize,
    },
  });
};

export const getParameterNums = () => {
  return request.get("/parameterHistory/parameterNums");
};

