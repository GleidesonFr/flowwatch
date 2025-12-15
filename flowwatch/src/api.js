const axios = require('axios');
const vscode = require('vscode');

function getConfig(){
    const config = vscode.workspace.getConfiguration('flowwatch');

    return {
        serverUrl: config.get("serverUrl"),
        user: config.get("user")
    };
}

async function lockFile(filePath){
    const { serverUrl, user } = getConfig();

    try {
        const response = await axios.post(`${serverUrl}/lock`, {
            path: filePath,
            user: user
        });     
        
        return response.data;
    } catch (error) {
        if(error.response && error.response.status === 409){
            throw{
                data: error.response.data
            };
        }
        throw error;
    }
}

async function unlockFile(filePath){
    const { serverUrl, user } = getConfig();

    return axios.post(`${serverUrl}/unlock`, {
        path: filePath,
        user: user
    });
}

module.exports = {
    lockFile,
    unlockFile
};