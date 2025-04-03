const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");
const csvParser = require("csv-parser");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const csvFilePath = path.join(__dirname, "../tracker/tasks.csv");
const dataFolder = path.join(__dirname, "data");

let latestProcessedData = []; // ✅ 클라이언트 접속 시 보여줄 데이터 저장

app.use(express.static(path.join(__dirname, "public")));

if (!fs.existsSync(dataFolder)) {
    fs.mkdirSync(dataFolder, { recursive: true });
}

chokidar.watch(csvFilePath).on("change", () => {
    console.log("📢 tasks.csv changed!");
    processCSV();
});

function processCSV() {
    const newData = [];

    fs.createReadStream(csvFilePath)
        .pipe(csvParser({ headers: false }))
        .on("data", (row) => {
            if (!row[4] || !row[6]) return;

            const startTimeMs = Date.parse(row[4]);
            const endTimeMs = Date.parse(row[6]);
            const units = parseInt(row[7]) || 1;

            if (isNaN(startTimeMs) || isNaN(endTimeMs)) {
                console.warn(`⚠️ Invalid date format: ${row[4]} - ${row[6]}`);
                return;
            }

            const elapsedTime = (endTimeMs - startTimeMs) / 1000; // 초 단위
            const timePerUnit = elapsedTime / units;

            newData.push({
                jobNumber: row[0],
                user: row[1],
                mainCategory: row[2],
                subCategory: row[3],
                startTime: row[4],
                endTime: row[6],
                elapsedTime: elapsedTime.toFixed(2),
                units: units,
                timePerUnit: timePerUnit.toFixed(2)
            });
        })
        .on("end", () => {
            latestProcessedData = newData; // ✅ 저장
            saveDataByCategory(newData);

            io.emit("data-updated", newData);
            io.emit("graph-data", collectGraphData());
        });
}

function collectGraphData() {
    const result = {}; // { [mainCategory]: [{ subCategory, timePerUnit }] }

    const categories = fs.readdirSync(dataFolder, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    categories.forEach((category) => {
        const csvPath = path.join(dataFolder, category, `${category}_data.csv`);
        if (!fs.existsSync(csvPath)) return;

        const rows = [];
        const fileContent = fs.readFileSync(csvPath, "utf-8");
        const lines = fileContent.trim().split("\n");

        // Skip header
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(",");
            const subCategory = cols[3]?.replace(/^"|"$/g, "");
            const timePerUnit = parseFloat(cols[8]);
            if (subCategory && !isNaN(timePerUnit)) {
                rows.push({ subCategory, timePerUnit });
            }
        }

        result[category] = rows;
    });

    return result;
}



function saveDataByCategory(data) {
    const categorizedData = {};

    data.forEach((task) => {
        const category = task.mainCategory;
        if (!categorizedData[category]) {
            categorizedData[category] = [];
        }
        categorizedData[category].push(task);
    });

    Object.keys(categorizedData).forEach((category) => {
        const categoryFolderPath = path.join(dataFolder, category);
        if (!fs.existsSync(categoryFolderPath)) {
            fs.mkdirSync(categoryFolderPath, { recursive: true });
        }

        const categoryFilePath = path.join(categoryFolderPath, `${category}_data.csv`);
        const header = ["Job Number", "User", "Main Category", "Sub Category", "Start Time", "Elapsed Time", "End Time", "Units", "Time per Unit"];
        const dataToSave = categorizedData[category].map(task => [
            task.jobNumber, task.user, task.mainCategory, task.subCategory,
            `"${task.startTime}"`, task.elapsedTime, `"${task.endTime}"`, task.units, task.timePerUnit
        ]);

        const fileExists = fs.existsSync(categoryFilePath);
        const writeStream = fs.createWriteStream(categoryFilePath, { flags: "a" });

        if (!fileExists) {
            writeStream.write(header.join(",") + "\n");
        }
        dataToSave.forEach(row => {
            writeStream.write(row.join(",") + "\n");
        });

        writeStream.end();
        console.log(`📄 ${category} data saved: ${categoryFilePath}`);
    });
}

io.on("connection", (socket) => {
    console.log("🔗 Client connected");

    // ✅ 접속 시 바로 최신 데이터 전송
    if (latestProcessedData.length > 0) {
        socket.emit("data-updated", latestProcessedData);
    }

    socket.on("disconnect", () => console.log("❌ Client disconnected"));
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = 3001;
server.listen(PORT, () => console.log(`🚀 Running on: http://localhost:${PORT}`));

// ✅ 서버 시작 시 초기 데이터 처리
processCSV();

