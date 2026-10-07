import request from "@/utils/request";

export const addModel = (trainModel) => {
  return request.post("/model", trainModel);
};

export const delModel = (id) => {
  return request.delete(`/model/${id}`);
};

export const getALLModel = () => {
  return request.get("/model/list");
};

export const getPageModel = (page = 1, pageSize = 9) => {
  return request.get("/model/page", {
    params: {
      page,
      pageSize,
    },
  });
};

export const existsTaskName = (taskName) =>{
  return request.get('/model/existTaskName',{
    params:{
      taskName,
    }
  })
}

export const getModelFilterObject = (config = {}) => {
  return request.get('/model/modelFilterObject', config);
}

export const getModelNums = () => {
  return request.get('/model/modelNums');
}

export const getModelNearlyDays = (nearlyDays) => {
  return request.get('/model/getModelNearlyDays', {
    params: {
      nearlyDays
    }
  })
}

export const getAlgoNearlyDays = (nearlyDays) => {
  return request.get('/model/getAlgoNearlyDays', {
    params: {
      nearlyDays
    }
  })
}
