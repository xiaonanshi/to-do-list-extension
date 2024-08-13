document.addEventListener('DOMContentLoaded', () => {
    const taskListToday = document.getElementById('task-list-today');
    const taskListLater = document.getElementById('task-list-later');
    const taskListCompleted = document.getElementById('task-list-completed');
    const taskInput = document.getElementById('task-input');
    const taskCategory = document.getElementById('task-category');
    const addTaskForm = document.getElementById('add-task-form');
    const addCurrentPageButton = document.getElementById('add-current-page-button');
    const deleteCompletedTasksButton = document.getElementById('delete-completed-tasks-button');
    const tasksTabButton = document.getElementById('tasks-tab-button');
    const completedTabButton = document.getElementById('completed-tab-button');
    const tasksTab = document.getElementById('tasks-tab');
    const completedTab = document.getElementById('completed-tab');
    const todayHeading = document.querySelector('#today-tasks h2');
    const laterHeading = document.querySelector('#later-tasks h2');
    const completedHeading = document.querySelector('.completed-header h2');

    // Function to generate a unique ID for each task
    function generateUniqueId() {
        return '_' + Math.random().toString(36).substr(2, 9);
    }

    // Function to switch tabs
    function switchTab(tab) {
        if (tab === 'tasks') {
            tasksTab.style.display = 'block';
            completedTab.style.display = 'none';
            tasksTabButton.classList.add('active');
            completedTabButton.classList.remove('active');
        } else if (tab === 'completed') {
            tasksTab.style.display = 'none';
            completedTab.style.display = 'block';
            tasksTabButton.classList.remove('active');
            completedTabButton.classList.add('active');
        }
    }

    // Initial tab setup
    switchTab('tasks');

    // Tab button event listeners
    tasksTabButton.addEventListener('click', () => switchTab('tasks'));
    completedTabButton.addEventListener('click', () => switchTab('completed'));

    // Load tasks from Chrome storage
    chrome.storage.sync.get({ tasks: [] }, (data) => {
        data.tasks.forEach((task) => {
            addTaskToDOM(task.id, task.title, task.url, task.completed, task.category);
        });
        updateBadge(); // Initial badge update
        updateHeadings(); // Initial headings update
    });

    // Add new task on form submit
    addTaskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const taskText = taskInput.value;
        const category = taskCategory.value;
        if (taskText) {
            const task = { id: generateUniqueId(), title: taskText, url: '', completed: false, category: category };
            chrome.storage.sync.get({ tasks: [] }, (data) => {
                const tasks = data.tasks;
                tasks.push(task);
                chrome.storage.sync.set({ tasks }, () => {
                    addTaskToDOM(task.id, task.title, task.url, task.completed, task.category);
                    taskInput.value = '';
                    updateBadge(); // Update badge after adding a task
                    updateHeadings(); // Update headings after adding a task
                    expandList(category); // Expand the list for the new task category
                });
            });
        }
    });

    // Add current page as a task
    addCurrentPageButton.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const activeTab = tabs[0];
            const taskTitle = activeTab.title;
            const taskUrl = activeTab.url;
            const category = taskCategory.value; // Get selected category
            const task = { id: generateUniqueId(), title: taskTitle, url: taskUrl, completed: false, category: category };
            chrome.storage.sync.get({ tasks: [] }, (data) => {
                const tasks = data.tasks;
                tasks.push(task);
                chrome.storage.sync.set({ tasks }, () => {
                    addTaskToDOM(task.id, task.title, task.url, task.completed, task.category);
                    updateBadge(); // Update badge after adding a current page task
                    updateHeadings(); // Update headings after adding a current page task
                    expandList(category); // Expand the list for the new task category
                });
            });
        });
    });

    // Function to add task to the DOM
    function addTaskToDOM(taskId, taskTitle, taskUrl, completed, category) {
        const li = document.createElement('li');
        li.draggable = true; // Make task draggable
        li.dataset.id = taskId;
        li.dataset.category = category;
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = completed;

        let taskTextElement;
        if (taskUrl) {
            taskTextElement = document.createElement('a');
            taskTextElement.href = taskUrl;
            taskTextElement.target = '_blank'; // Open link in a new tab
        } else {
            taskTextElement = document.createElement('span');
        }
        taskTextElement.textContent = taskTitle;
        taskTextElement.classList.toggle('completed', completed);

        const taskButtons = document.createElement('div');
        taskButtons.classList.add('task-buttons');

        const editButton = document.createElement('button');
        editButton.innerHTML = '<i class="fas fa-edit"></i>';
        editButton.classList.add('edit-button');
        editButton.style.display = completed ? 'none' : 'inline'; // Hide edit button if task is completed
        editButton.addEventListener('click', () => {
            taskTextElement.contentEditable = 'true';
            taskTextElement.focus();
            taskTextElement.classList.add('editable'); // Add the editable class to apply styles
            editButton.style.display = 'none';
            finishButton.style.display = 'inline';
        });

        const finishButton = document.createElement('button');
        finishButton.innerHTML = '<i class="fas fa-check"></i>';
        finishButton.classList.add('finish-button');
        finishButton.style.display = 'none';
        finishButton.addEventListener('click', () => {
            const newTaskText = taskTextElement.textContent;
            if (newTaskText !== '') {
                updateTaskTitle(taskId, newTaskText, taskUrl, category);
                taskTitle = newTaskText;
            }
            taskTextElement.contentEditable = 'false';
            taskTextElement.classList.remove('editable'); // Remove the editable class after editing
            finishButton.style.display = 'none';
            editButton.style.display = 'inline';
            updateBadge(); // Update badge after editing a task
            updateHeadings(); // Update headings after editing a task
        });

        taskButtons.appendChild(editButton);
        taskButtons.appendChild(finishButton);

        li.appendChild(checkbox);
        li.appendChild(taskTextElement);
        li.appendChild(taskButtons);

        // Add the task to the correct category and position
        if (completed) {
            taskListCompleted.appendChild(li);
        } else if (category === 'today') {
            const firstCompletedTask = taskListToday.querySelector('.completed');
            if (firstCompletedTask) {
                taskListToday.insertBefore(li, firstCompletedTask);
            } else {
                taskListToday.appendChild(li);
            }
        } else {
            const firstCompletedTask = taskListLater.querySelector('.completed');
            if (firstCompletedTask) {
                taskListLater.insertBefore(li, firstCompletedTask);
            } else {
                taskListLater.appendChild(li);
            }
        }

        // Event listener for the checkbox to mark task as completed
        checkbox.addEventListener('change', () => {
            taskTextElement.classList.toggle('completed', checkbox.checked);
            editButton.style.display = checkbox.checked ? 'none' : 'inline'; // Toggle edit button visibility
            updateTaskCompletion(taskId, checkbox.checked, category);
            moveCompletedTask(li, checkbox.checked, category);
            updateBadge(); // Update badge after completing a task
            updateHeadings(); // Update headings after completing a task
        });

        // Drag and drop functionality
        li.addEventListener('dragstart', () => {
            li.classList.add('dragging');
        });

        li.addEventListener('dragend', () => {
            li.classList.remove('dragging');
            updateTaskOrder();
        });

        li.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggingElement = document.querySelector('.dragging');
            const elements = [...taskListToday.querySelectorAll('li:not(.dragging)'), ...taskListLater.querySelectorAll('li:not(.dragging)')];
            const nextElement = elements.find(element => {
                return e.clientY <= element.getBoundingClientRect().top + element.offsetHeight / 2;
            });

            if (nextElement) {
                nextElement.parentElement.insertBefore(draggingElement, nextElement);
            } else if (e.target.closest('ul') === taskListToday || e.target.closest('ul') === taskListLater) {
                e.target.closest('ul').appendChild(draggingElement);
            }
        });

        li.addEventListener('drop', (e) => {
            e.preventDefault();
            const draggingElement = document.querySelector('.dragging');
            const targetList = e.target.closest('ul') || (e.target.tagName === 'H2' && e.target.nextElementSibling);
            if (targetList && targetList !== draggingElement.parentElement) {
                targetList.appendChild(draggingElement);
                updateTaskCategory(draggingElement.dataset.id, targetList.id.replace('task-list-', ''));
            }
        });
    }

    // Function to update task completion status in storage
    function updateTaskCompletion(taskId, completed, category) {
        chrome.storage.sync.get({ tasks: [] }, (data) => {
            const tasks = data.tasks.map(task => {
                if (task.id === taskId) {
                    task.completed = completed;
                }
                return task;
            });
            chrome.storage.sync.set({ tasks }, () => {
                updateBadge(); // Ensure badge is updated after setting tasks
                updateHeadings(); // Update headings after setting tasks
            });
        });
    }

    // Function to update task title in storage
    function updateTaskTitle(taskId, newTitle, taskUrl, category) {
        chrome.storage.sync.get({ tasks: [] }, (data) => {
            const tasks = data.tasks.map(task => {
                if (task.id === taskId) {
                    task.title = newTitle;
                    task.category = category;
                }
                return task;
            });
            chrome.storage.sync.set({ tasks }, () => {
                updateBadge(); // Ensure badge is updated after setting tasks
                updateHeadings(); // Update headings after setting tasks
            });
        });
    }

    // Function to update task order in storage
    function updateTaskOrder() {
        const taskElementsToday = [...taskListToday.querySelectorAll('li')];
        const taskElementsLater = [...taskListLater.querySelectorAll('li')];
        const taskElementsCompleted = [...taskListCompleted.querySelectorAll('li')];
        const tasks = [...taskElementsToday, ...taskElementsLater, ...taskElementsCompleted].map(taskElement => {
            const checkbox = taskElement.querySelector('input[type="checkbox"]');
            const taskTextElement = taskElement.querySelector('a, span');
            const category = taskListToday.contains(taskElement) ? 'today' : (taskListLater.contains(taskElement) ? 'later' : 'completed');
            return {
                id: taskElement.dataset.id,
                title: taskTextElement.textContent,
                url: taskTextElement.href || '',
                completed: checkbox.checked,
                category: category
            };
        });

        chrome.storage.sync.set({ tasks }, () => {
            updateBadge(); // Ensure badge is updated after setting tasks
            updateHeadings(); // Update headings after setting tasks
        });
    }

    // Function to update task category in storage
    function updateTaskCategory(taskId, newCategory) {
        chrome.storage.sync.get({ tasks: [] }, (data) => {
            const tasks = data.tasks.map(task => {
                if (task.id === taskId) {
                    task.category = newCategory;
                }
                return task;
            });
            chrome.storage.sync.set({ tasks }, () => {
                updateBadge(); // Ensure badge is updated after setting tasks
                updateHeadings(); // Update headings after setting tasks
            });
        });
    }

    // Function to move completed tasks to the completed section
    function moveCompletedTask(taskElement, completed, category) {
        if (completed) {
            taskListCompleted.appendChild(taskElement);
        } else if (category === 'today') {
            const firstCompletedTask = taskListToday.querySelector('.completed');
            if (firstCompletedTask) {
                taskListToday.insertBefore(taskElement, firstCompletedTask);
            } else {
                taskListToday.appendChild(taskElement);
            }
        } else {
            const firstCompletedTask = taskListLater.querySelector('.completed');
            if (firstCompletedTask) {
                taskListLater.insertBefore(taskElement, firstCompletedTask);
            } else {
                taskListLater.appendChild(taskElement);
            }
        }
    }

    // Function to delete completed tasks
    deleteCompletedTasksButton.addEventListener('click', () => {
        chrome.storage.sync.get({ tasks: [] }, (data) => {
            const tasks = data.tasks.filter(task => !task.completed);
            chrome.storage.sync.set({ tasks }, () => {
                taskListToday.innerHTML = '';
                taskListLater.innerHTML = '';
                taskListCompleted.innerHTML = '';
                tasks.forEach(task => addTaskToDOM(task.id, task.title, task.url, task.completed, task.category));
                updateBadge(); // Update badge after deleting completed tasks
                updateHeadings(); // Update headings after deleting completed tasks
            });
        });
    });

    // Function to update the badge with the number of incomplete tasks
    function updateBadge() {
        chrome.storage.sync.get({ tasks: [] }, (data) => {
            const incompleteTasks = data.tasks.filter(task => !task.completed && task.category === 'today').length;
            chrome.action.setBadgeText({ text: incompleteTasks.toString() });
            chrome.action.setBadgeBackgroundColor({ color: '#f9de87' }); // Yellow background color for the badge
        });
    }

    // Function to update headings with the number of incomplete tasks for each category
    function updateHeadings() {
        chrome.storage.sync.get({ tasks: [] }, (data) => {
            const todayTasksCount = data.tasks.filter(task => !task.completed && task.category === 'today').length;
            const laterTasksCount = data.tasks.filter(task => !task.completed && task.category === 'later').length;
            const completedTasksCount = data.tasks.filter(task => task.completed).length;

            todayHeading.textContent = `Today (${todayTasksCount})`;
            laterHeading.textContent = `Later (${laterTasksCount})`;
            completedHeading.textContent = `Completed (${completedTasksCount})`;
        });
    }

    // Function to toggle task list visibility
    function toggleTaskListVisibility(heading, taskList) {
        heading.addEventListener('click', () => {
            taskList.classList.toggle('collapsed');
        });

        // Enable dragging to the heading for collapsed lists
        heading.addEventListener('dragover', (e) => {
            e.preventDefault();
            heading.classList.add('drag-over');
        });

        heading.addEventListener('dragleave', () => {
            heading.classList.remove('drag-over');
        });

        heading.addEventListener('drop', (e) => {
            e.preventDefault();
            const draggingElement = document.querySelector('.dragging');
            taskList.appendChild(draggingElement);
            updateTaskCategory(draggingElement.dataset.id, taskList.id.replace('task-list-', ''));
            heading.classList.remove('drag-over');
        });
    }

    // Function to expand a specific task list
    function expandList(category) {
        let taskList;

        if (category === 'today') {
            taskList = taskListToday;
        } else if (category === 'later') {
            taskList = taskListLater;
        } else if (category === 'completed') {
            taskList = taskListCompleted;
        }

        taskList.classList.remove('collapsed');
    }

    // Add event listeners to headings for toggling
    toggleTaskListVisibility(todayHeading, taskListToday);
    toggleTaskListVisibility(laterHeading, taskListLater);
    toggleTaskListVisibility(completedHeading, taskListCompleted);

    // Set default states for task lists
    taskListToday.classList.remove('collapsed');
    taskListCompleted.classList.add('collapsed');
    taskListLater.classList.add('collapsed');
});
