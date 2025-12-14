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

    return axios.post(`${serverUrl}/lock`, {
        path: filePath,
        user: user
    });
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