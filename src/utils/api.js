import { Message } from 'element-ui'
import request from './request'

function handleLegacyMessage(response) {
    if (response && response.code == 403) {
        Message.error({ message: response.message });
        return;
    }

    if (response && response.message) {
        Message.success({ message: response.message });
    }

    return response;
}

export const postRequest= (url,params)=>{
    return request({
        method:'post',
        url,
        data:params
    }).then(handleLegacyMessage)
}

export const getRequest = (url, params) => {
    return request({
        method: 'get',
        url,
        params,
    }).then(handleLegacyMessage)
}

export const putRequest = (url, params) => {
    return request({
        method: 'put',
        url,
        data: params,
    }).then(handleLegacyMessage)
}

export const deleteRequest = (url, params) => {
    return request({
        method: 'delete',
        url,
        data: params,
    }).then(handleLegacyMessage)
}
