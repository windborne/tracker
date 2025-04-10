let tasks = [];

const subCategories = {
    "Main": ["Built up (before initial test) (MI 1.1)", "Initial test (MI 1.2, 1.3)", "Sat-Com (MI 2.1, 2.2)", "Batt + Form + Plastic Bag (MI 3.1, 3.2)", "Mylar install + Solar (MI 3.3, 3.4)"],
    "Main (Part_Prep)": ["Mylar laser cut", "Wrapping Modem (MI 1)", "Form Cutting (MI 2)", "Bag cutting & Sealing (MI 3)", "Battery Prep (MI 4)", "Mylar Folding (MI 5)", "Solar Panel Soldering (MI 6)"],
    "Ballast": ["Red-tag (MI: prep)", "Sticker Printing (MI: Sticker)", "Bag cutting (By machine)", "Bag-prep(Marking) (MI 1)", "Bag-prep(sealing)", "Actuator (MI 2)", "Bag Assembly (MI 3)", "Bag Fill + Mtrack + Sticker (MI: Fill, Seal, Sticker)"],
    "Apex": ["Glue (MI 1.1, 1.2, 1.3, 1.4)", "Assembly and Test (MI 4, 5)", "Press (PCB) (MI 2.1, 2.2, 2.3)", "Press (CAP) (MI 3.1)"],
    "Envelope": ["Box prep", "Neck Cutting", "Neck Sealing", "Cut Sleeve", "Kapton Donut Cut", "Mtrack and Boxing", "Envelope manufacturing"],
    "Sensor": ["Long Therm Soldering", "Short Therm Soldering to the board", "Long Therm Soldering to the board", "Long Therm Wire cutting", "Short Therm Prep", "Humical unloading", "Epoxy", "Loading", "Watergate", "Precal/masking/Plating", "Cable prep", "Dipping Conformal boards", "Cleaning sensor", "Cleaning plates"],
    "Dangly Prep": ["Cleaning Aluminum Sheild", "Folding Aluminum Shield", "Sensor Mylar Cut", "Aluminum shield + Sensor", "Mylar + Unit"],
    "Sensor Bag Prep": ["Bag - heat press (MI 1)", "Plast tube winding (MI 2)", "Platic tube cutting (MI 2)", "Winder and Tie (MI 3)", "Bag Packaging (MI 4)", "Cable prep", "re-work"],
    "Sensor Bag Final Assembly": ["Dangly + Sensoor bag", "re-work"],
    "Final Integration": ["Final Test (MI: Final test)", "Final Assembly (MI: Main Integration)", "Packaging (MI: Packaging)", "re-work"]
};

function updateSubCategories() {
    const mainCategory = document.getElementById("mainCategory").value;
    const subCategorySelect = document.getElementById("subCategory");
    subCategorySelect.innerHTML = "<option value=''>Select Category</option>";
    if (mainCategory && subCategories[mainCategory]) {
        subCategories[mainCategory].forEach(sub => {
            const option = document.createElement("option");
            option.value = sub;
            option.textContent = sub;
            subCategorySelect.appendChild(option);
        });
    }
}

function handleUsernameChange() {
    const username = document.getElementById("username").value;
    const loadTasksButton = document.getElementById("loadTasksButton");
    loadTasksButton.disabled = !username;
}

async function loadTasks() {
    const username = document.getElementById("username").value;
    if (!username) return;

    try {
        const response = await fetch(`/tasks/${username}`);
        if (!response.ok) throw new Error('Failed to load tasks');
        const data = await response.json();
        tasks = data;
        renderTasks();
    } catch (error) {
        console.error("❌ Load Tasks Error:", error);
    }
}

async function addTask() {
    const mainCategory = document.getElementById("mainCategory").value;
    const subCategory = document.getElementById("subCategory").value;
    const username = document.getElementById("username").value;

    if (!username || !mainCategory || !subCategory) {
        alert("Please select a username, main category, and subcategory!");
        return;
    }

    const taskId = Date.now();
    const startTime = new Date().toLocaleString();

    const task = {
        id: taskId,
        username: username,
        mainCategory: mainCategory,
        subCategory: subCategory,
        startTime,
        elapsedTime: 0,
        endTime: null,
        quantity: null,
        note: null,
        status: 'pending'
    };

    tasks.unshift(task);

    try {
        const response = await fetch(`/save/${username}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(task)
        });
        if (!response.ok) throw new Error('Failed to save task');
        renderTasks();
    } catch (error) {
        console.error("❌ Add Task Error:", error);
        alert("Failed to add task!");
    }
}

function stopTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.endTime = new Date().toLocaleString();
        document.getElementById(`quantityInput-${taskId}`).classList.remove("hidden");
    }
    renderTasks(); // UI 즉시 업데이트
}

function checkInputState() {
    const username = document.getElementById("username").value;
    const mainCategory = document.getElementById("mainCategory").value;
    const subCategory = document.getElementById("subCategory").value;
    const addTaskButton = document.getElementById("addTaskButton");

    addTaskButton.disabled = !(username && mainCategory && subCategory);
}

async function saveTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    const quantity = document.getElementById(`quantity-${taskId}`).value;
    const note = document.getElementById(`note-${taskId}`).value;

    if (!quantity) {
        alert("Qty?!");
        return;
    }

    task.quantity = quantity;
    task.note = note;
    task.status = 'completed';

    try {
        const response = await fetch(`/end-task/${task.username}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(task)
        });
        if (!response.ok) throw new Error('Failed to save completed task');
        renderTasks();
    } catch (error) {
        console.error("❌ Save Task Error:", error);
        alert("Failed to save task!");
    }
}

function editTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    const taskElement = document.getElementById(`task-${taskId}`);
    taskElement.innerHTML = `
        <div>
            <p>${task.username}: ${task.mainCategory} - ${task.subCategory}</p>
            <p>Start: ${task.startTime}</p>
            <p>End: ${task.endTime}</p>
        </div>
        <div>
            <input type="number" id="edit-quantity-${taskId}" class="input-qty" value="${task.quantity}">
            <input type="text" id="edit-note-${taskId}" class="input-note" value="${task.note || ''}">
            <button onclick="saveEditedTask(${task.id})">Save</button>
        </div>
    `;
}

async function saveEditedTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    const newQuantity = document.getElementById(`edit-quantity-${taskId}`).value;
    const newNote = document.getElementById(`edit-note-${taskId}`).value;

    if (!newQuantity) {
        alert("Qty?!");
        return;
    }

    task.quantity = newQuantity;
    task.note = newNote;

    try {
        const response = await fetch(`/edit-task/${task.username}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(task)
        });
        if (!response.ok) throw new Error('Failed to edit task');
        renderTasks();
    } catch (error) {
        console.error("❌ Edit Task Error:", error);
        alert("Failed to edit task!");
    }
}

function renderTasks() {
    const taskList = document.getElementById("taskList");
    taskList.innerHTML = "";

    tasks.forEach(task => {
        taskList.innerHTML += `
            <div class="task" id="task-${task.id}">
                <div>
                    <p>${task.username}: ${task.mainCategory} - ${task.subCategory}</p>
                    <p>Start: ${task.startTime}</p>
                    ${task.endTime ? `<p>End: ${task.endTime}</p>` : ""}
                </div>
                ${task.status === 'completed' ? `
                    <p><strong>Qty:</strong> ${task.quantity}</p>
                    ${task.note ? `<p><strong>Note:</strong> ${task.note}</p>` : ""}
                    <button onclick="editTask(${task.id})">Edit</button>
                ` : `
                    <button onclick="stopTask(${task.id})">End</button>
                    <div id="quantityInput-${task.id}" class="${task.endTime ? '' : 'hidden'}">
                        <input type="number" id="quantity-${task.id}" class="input-qty" placeholder="Qty" value="${task.quantity || ''}">
                        <input type="text" id="note-${task.id}" class="input-note" placeholder="Note (optional)" value="${task.note || ''}">
                        <button onclick="saveTask(${task.id})">Save</button>
                    </div>
                `}
            </div>
        `;
    });
}