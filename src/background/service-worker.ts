import { setPendingSelection } from "../shared/storage";

const MENU_ID = "parse-selection-with-time-toolkit";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: "用时间工具箱解析“%s”",
      contexts: ["selection"]
    });
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== MENU_ID || !info.selectionText) return;

  void setPendingSelection(info.selectionText.trim()).then(() => {
    if (chrome.action.openPopup) {
      void chrome.action.openPopup();
    }
  });
});
