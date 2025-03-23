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
    "Sensor": ["Long Therm Soldering","Short Therm Soldering to the board","Long Therm Soldering to the board","Long Therm Wire cutting","Short Therm Prep","Humical unloading"],
    "Dangly Prep": ["Cleaning Aluminum Sheild","Folding Aluminum Shield","Sensor Mylar Cut","Aluminum shield + Sensor","Mylar + Unit"],
    "Sensor Bag Prep": ["Bag - heat press (MI 1)","Plast tube winding (MI 2)","Platic tube cutting (MI 2)","Winder and Tie (MI 3)","Bag Packaging (MI 4)"],
    "Sensor Bag Final Assembly": ["Dangly + Sensoor bag"],
    "Final Integration": ["Final Test (MI: Final test)","Final Assembly (MI: Main Integration)","Packaging (MI: Packaging)"]
};

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

// 페이지 로드 시 저장된 작업을 불러오는 함수
async function loadTasks() {
    const response = await fetch('/tasks');
    const data = await response.json();
    tasks = data;
    renderTasks();
}

// 작업 추가 함수
async function addTask() {
    const mainCategory = document.getElementById("mainCategory").value;
    const subCategory = document.getElementById("subCategory").value;
    const username = document.getElementById("username").value;
    const taskId = Date.now();
    const startTime = new Date().toLocaleTimeString();

    const task = {
        id: taskId,
        username: username,
        category: `${mainCategory} - ${subCategory}`,
        startTime,
        elapsedTime: 0,
        interval: null,
        endTime: null,
        quantity: null
    };

    task.interval = setInterval(() => updateElapsedTime(taskId), 1000);
    tasks.unshift(task)

    // 서버에 작업 저장
    await fetch('/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
    });

    renderTasks();
}

// 작업 시간 업데이트 함수
function updateElapsedTime(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.elapsedTime++;
        document.getElementById(`elapsedTime-${taskId}`).textContent = `Duration: ${task.elapsedTime}sec`;
    }
}

// 작업 종료 함수
function stopTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        clearInterval(task.interval);
        task.endTime = new Date().toLocaleTimeString();
        document.getElementById(`quantityInput-${taskId}`).classList.remove("hidden");
    }
}

// 작업 저장 함수
async function saveTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    const quantity = document.getElementById(`quantity-${taskId}`).value;

    if (!quantity) {
        alert("Qty?!");
        return;
    }

    task.quantity = quantity;

    try {
        // /end-task 엔드포인트 호출
        const response = await fetch('/end-task', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(task)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.text();
        console.log("✅ Server Response:", data);
        renderTasks();
    } catch (error) {
        console.error("❌ Server end-task error:", error);
    }
}

// 작업 목록 렌더링 함수
function renderTasks() {
    const taskList = document.getElementById("taskList");
    taskList.innerHTML = "";

    tasks.forEach(task => {
        taskList.innerHTML += `
            <div class="task" id="task-${task.id}">
                <div>
                    <p>${task.username}: ${task.category}</p>
                    <p>Start: ${task.startTime}</p>
                    <p id="elapsedTime-${task.id}">Duration: ${task.elapsedTime}sec</p>
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

// 페이지 로드 시 데이터 불러오기
window.onload = loadTasks;
updateSubCategories();