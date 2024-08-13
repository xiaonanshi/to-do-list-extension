// background.js

// Function to update the badge with the number of incomplete tasks
function updateBadge() {
    chrome.storage.sync.get({ tasks: [] }, (data) => {
        const incompleteTasks = data.tasks.filter(task => !task.completed).length;
        chrome.action.setBadgeText({ text: incompleteTasks.toString() });
        chrome.action.setBadgeBackgroundColor({ color: '#FF0000' }); // Red background color for the badge
    });
}

// Listen for changes to the tasks in storage and update the badge
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (changes.tasks) {
        updateBadge();
    }
});

// Initial badge update
updateBadge();
