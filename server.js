const express = require('express');
const fs = require('fs');
const path = require('path');
const fastcsv = require('fast-csv');  // CSV 저장을 위한 fast-csv

const app = express();
app.use(express.json());

const PORT = 3000;
const jsonFilePath = path.join(__dirname, 'tasks.json');  // 진행 중인 작업 저장 JSON
const csvFilePath = path.join(__dirname, 'tasks.csv');  // 완료된 작업 저장 CSV

// 진행 중인 작업을 JSON 파일에 저장
async function saveToJsonFile(data) {
    let existingData = [];
    try {
        const fileContent = await fs.readFile(jsonFilePath, 'utf8');
        existingData = JSON.parse(fileContent);
    } catch (error) {
        console.log("⚠ JSON 파일이 없으므로 새로 생성합니다.");
    }
    
    existingData.push(data);
    await fs.promises.writeFile(jsonFilePath, JSON.stringify(updatedTasks, null, 2), 'utf8');
    console.log("✅ JSON 파일에 데이터 저장 완료.");
}

// 작업을 CSV 파일로 저장하는 함수
// CSV 파일에 저장하는 함수

async function saveToCsvFile(data) {
    try {
        let fileExists = false;

        // 파일이 존재하는지 확인
        try {
            await fs.promises.access(csvFilePath);  
            fileExists = true;
        } catch (error) {
            fileExists = false;
        }

        const taskData = [
            data.id, 
            data.username, 
            data.category, 
            data.startTime, 
            data.elapsedTime, 
            data.endTime || '', 
            data.quantity || ''
        ];

        // CSV 파일 쓰기 스트림 열기
        const writeStream = fs.createWriteStream(csvFilePath, { flags: fileExists ? 'a' : 'w' });
        const csvStream = fastcsv.format({ 
            headers: !fileExists, 
            writeBOM: true,
            quote: '"' // 값을 큰따옴표로 감쌉니다
        });

        // CSV 스트림을 파일에 기록
        csvStream.pipe(writeStream);

        // 데이터 기록
        csvStream.write(taskData);  // 한 줄에 데이터를 기록

        // 파일 끝에 도달하면 스트림 종료 (자동으로 줄바꿈 추가됨)
        csvStream.end();

        // `writeStream`에 대한 종료를 명시적으로 처리
        writeStream.on('finish', () => {
            console.log("✅ CSV 파일에 데이터 저장 완료.");
        });

        // 명시적으로 줄바꿈을 추가
        writeStream.write("\n");  // 데이터 끝에 새로운 줄 추가

    } catch (error) {
        console.error("❌ CSV 저장 오류:", error.message);
        throw error;
    }
}



// POST 요청으로 작업 추가 (JSON 저장)
app.post('/save', async (req, res) => {
    try {
        await saveToJsonFile(req.body);
        res.send("✅ JSON 저장 완료");
    } catch (error) {
        res.status(400).send(error.message);
    }
});

// ✅ 클라이언트에서 작업 종료 시 호출되는 엔드포인트 (CSV 저장 및 JSON 삭제)
app.post('/end-task', async (req, res) => {
    try {
        const task = req.body;

        // 종료된 작업을 CSV에 저장
        await saveToCsvFile(task);

        // JSON에서 해당 작업 삭제 후 저장
        const tasks = await getAllTasks();
        const updatedTasks = tasks.filter(t => t.id !== task.id);
        // json 파일을 'utf8' 인코딩을 사용해 저장
        await fs.promises.writeFile(jsonFilePath, JSON.stringify(updatedTasks, null, 2), 'utf8');

        console.log("✅ Task removed from JSON and saved to CSV successfully.");
        res.send("✅ Data saved to CSV after task completion.");
    } catch (error) {
        console.error("❌ Error saving to CSV and removing task from JSON:", error.message);
        res.status(400).send(error.message);
    }
});

// 진행 중인 작업 목록 가져오기
async function getAllTasks() {
    try {
        const fileData = await fs.readFile(jsonFilePath, 'utf8');
        return JSON.parse(fileData);
    } catch (error) {
        return [];  // 파일이 없으면 빈 배열 반환
    }
}

// 진행 중인 작업 GET 요청
app.get('/tasks', async (req, res) => {
    try {
        const tasks = await getAllTasks();
        res.json(tasks);
    } catch (error) {
        res.status(500).send("❌ 작업 목록 불러오기 오류");
    }
});

// 정적 파일 제공 (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// 메인 페이지 반환
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 서버 시작
app.listen(PORT, () => console.log(`✅ 서버 실행 중: http://localhost:${PORT}`));
