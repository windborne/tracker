let tasks = [];

const subCategories = {
    //main
    "Main": ["Built up (before initial test) (MI 1.1)", "Initial test (MI 1.2, 1.3)", "Sat-Com (MI 2.1, 2.2)", "Batt + Form + Plastic Bag (MI 3.1, 3.2)","Mylar install + Solar (MI 3.3, 3.4)"],
    "Main (Part_Prep)": ["Mylar laser cut", "Wrapping Modem (MI 1)", "Form Cutting (MI 2)", "Bag cutting & Sealing (MI 3)", "Battery Prep (MI 4)","Mylar Folding (MI 5)","Solar Panel Soldering (MI 6)" ],
    //ballast, apex, env
    "Ballast": ["Red-tag (MI: prep)", "Sticker Printing (MI: Sticker)", "Bag cutting (By machine)", "Bag Prep (MI 1)", "Actuator (MI 2)", "Bag Assembly (MI 3)", "Bag Fill + Mtrack + Sticker (MI: Fill, Seal, Sticker)"],
    "Apex": ["Glue (MI 1.1, 1.2, 1.3, 1.4)","Assembly and Test (MI 4, 5)","Press (PCB) (MI 2.1, 2.2, 2.3)","Press (CAP) (MI 3.1)"],
    "Envelope": ["Box prep","Neck Cutting","Neck Sealing","Cut Sleeve","Kapton Donut Cut","Mtrack and Boxing","Envelope manufacturing"],
    //sensor
    "Sensor": ["Long Therm Soldering","Short Therm Soldering to the board","Long Therm Soldering to the board","Long Therm Wire cutting","Short Therm Prep","Humical unloading","Epoxy","Loading","Watergate","Precal/masking/Plating","Cable prep","Dipping Conformal boards"],
    "Dangly Prep": ["Cleaning Aluminum Sheild","Folding Aluminum Shield","Sensor Mylar Cut","Aluminum shield + Sensor","Mylar + Unit"],
    "Sensor Bag Prep": ["Bag - heat press (MI 1)","Plast tube winding (MI 2)","Platic tube cutting (MI 2)","Winder and Tie (MI 3)","Bag Packaging (MI 4)","Cable prep","re-work"],
    "Sensor Bag Final Assembly": ["Dangly + Sensoor bag","re-work"],
    "Final Integration": ["Final Test (MI: Final test)","Final Assembly (MI: Main Integration)","Packaging (MI: Packaging)","re-work"]
};

// update sub
function updateSubCategories() {
    const mainCategory = document.getElementById("mainCategory").value;
    const subCategorySelect = document.getElementById("subCategory");
    subCategorySelect.innerHTML = "";
    subCategories[mainCategory].forEach(sub => {
        const option = document.createElement("option");
        option.value = sub;
        option.textContent = sub;
        subCategorySelect.appendChild(option);
    });
}

// select name -> able/disable button
function handleUsernameChange() {
    const username = document.getElementById("username").value;
    const loadTasksButton = document.getElementById("loadTasksButton");
    if (username) {
        loadTasksButton.disabled = false; 
    } else {
        loadTasksButton.disabled = true;  
    }
}

// read task for selected user
async function loadTasks() {
    const username = document.getElementById("username").value;
    const response = await fetch(`/tasks/${username}`);
    const data = await response.json();
    tasks = data;  // save task
    renderTasks();  
}

// add task feature
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
        quantity: null
    };

    tasks.unshift(task);

    await fetch(`/save/${username}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
    });

    renderTasks();
}


function stopTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.endTime = new Date().toLocaleString();
        document.getElementById(`quantityInput-${taskId}`).classList.remove("hidden");
    }
}


function saveTask(taskId) {

    
    const task = tasks.find(t => t.id === taskId);
    const quantity = document.getElementById(`quantity-${taskId}`).value;

    if (!quantity) {
        alert("Qty?!");  
        return;
    }

    task.quantity = quantity;

    fetch(`/end-task/${task.username}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task)
    })
    .then(response => response.text())
    .then(data => {
        tasks = tasks.filter(t => t.id !== taskId);  
        renderTasks();  
    })
    .catch(error => console.error("❌ Fetch Error:", error));
}

function renderTasks() {
    const taskList = document.getElementById("taskList");
    taskList.innerHTML = "";

    tasks.forEach(task => {
        taskList.innerHTML += `
            <div class="task" id="task-${task.id}">
                <div>
                    <p>${task.username}: ${task.mainCategory} - ${task.subCategory} </p>
                    <p>Start: ${task.startTime}</p>
                    ${task.endTime ? `<p>End: ${task.endTime}</p>` : ""}
                </div>
                ${task.quantity === null ? `
                    <button onclick="stopTask(${task.id})">End</button>
                    <div id="quantityInput-${task.id}" class="hidden">
                        <input type="number" id="quantity-${task.id}" placeholder="Qty">
                        <button onclick="saveTask(${task.id})">Save</button>
                    </div>
                ` : `<p>Qty: ${task.quantity}</p>`}
            </div>
        `;
    });
}

function checkInputState() {
    const username = document.getElementById("username").value;
    const mainCategory = document.getElementById("mainCategory").value;
    const subCategory = document.getElementById("subCategory").value;
    const addTaskButton = document.getElementById("addTaskButton");

    if (username && mainCategory && subCategory) {
        addTaskButton.disabled = false;
    } else {
        addTaskButton.disabled = true;
    }
}

window.onload = () => {
    handleUsernameChange();  
    updateSubCategories();
    checkInputState();
};
