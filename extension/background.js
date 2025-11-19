// Change this to your production URL when deploying
const APP_URL = "http://localhost:3000"; 

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "save-to-memories",
    title: "Save to Memories",
    contexts: ["page", "link", "selection"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "save-to-memories") {
    // Prioritize link URL, then selected text (if it looks like a URL), then page URL
    let targetUrl = info.linkUrl || info.selectionText || info.pageUrl;
    
    // Basic cleanup
    if (targetUrl) {
      targetUrl = targetUrl.trim();
    }

    if (!targetUrl) {
      console.error("No URL found to save");
      return;
    }

    // Update badge to indicate processing
    try {
      await chrome.action.setBadgeText({ text: "..." });
      await chrome.action.setBadgeBackgroundColor({ color: "#FFA500" }); // Orange
    } catch (e) {
      // Ignore errors if action API is not available (should be in MV3)
      console.warn("Badge update failed", e);
    }

    try {
      console.log("Saving URL:", targetUrl);
      const response = await fetch(`${APP_URL}/api/save-memory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: targetUrl })
      });

      if (response.ok) {
        console.log("Save successful");
        await chrome.action.setBadgeText({ text: "OK" });
        await chrome.action.setBadgeBackgroundColor({ color: "#00FF00" }); // Green
        setTimeout(() => chrome.action.setBadgeText({ text: "" }), 2000);
      } else {
        console.error("Save failed with status:", response.status);
        await chrome.action.setBadgeText({ text: "ERR" });
        await chrome.action.setBadgeBackgroundColor({ color: "#FF0000" }); // Red
      }
    } catch (error) {
      console.error('Save failed (network/fetch error):', error);
      await chrome.action.setBadgeText({ text: "ERR" });
      await chrome.action.setBadgeBackgroundColor({ color: "#FF0000" }); // Red
    }
  }
});
