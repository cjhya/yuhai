import request from "@/utils/request";

export const getUserAll = () => {
  return request.get('user/querUser')
}


export function getRequest(url, paramObj, config = {}) {
  const requestConfig = {
    ...config,
    method: "get",
    url,
  };

  if (paramObj !== undefined) {
    requestConfig.params = paramObj;
  }

  return request(requestConfig);
}

export function getRequestWithRestful(url, config = {}) {
  return request({
    ...config,
    method: "get",
    url,
  });
}

export function postRequest(url, data, config = {}) {
  return request({
    ...config,
    method: "post",
    url,
    data,
  })
}
