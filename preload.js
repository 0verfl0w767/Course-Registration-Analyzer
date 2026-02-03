const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  getAll: () => ipcRenderer.invoke("get-all"),
  getAllGyoyang: () => ipcRenderer.invoke("get-all-gyoyang"),
  getEnable: () => ipcRenderer.invoke("get-enable"),
  getCse: () => ipcRenderer.invoke("get-cse"),
});
