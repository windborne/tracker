const express = require('express');
const fs = require('fs');
const path = require('path');
const fastcsv = require('fast-csv');

const app = express();
app.use(express.json());

const PORT = 3000;
const tasksDir = path.join(__dirname, 'tasks');  // 사용자별 작업 파일을 저장할 디렉토리
const csvFilePath = path.join(__dirname, 'tasks.csv');  // 완료된 작업 CSV 파일

// 사용자별 JSON 파일 경로
function getUserFilePath(username) {
    return path.join(tasksDir, `${username}.json`);
}

// 사용자 디렉토리와 파일을 생성하는 함수
async function ensureUserFileExists(username) {
    const userFilePath = getUserFilePath(username);

    try {
        // tasks 디렉토리 확인 및 생성
        await fs.promises.mkdir(tasksDir, { recursive: true });

        // 사용자 파일이 없으면 새로 생성
        if (!fs.existsSync(userFilePath)) {
            await fs.promises.writeFile(userFilePath, JSON.stringify([], null, 2), 'utf8');
            console.log(`✅ ${username}.json 파일이 생성되었습니다.`);
        }
    } catch (error) {
        console.error("❌ 디렉토리나 파일 생성 오류:", error.message);
        throw error;
    }
}

// JSON 파일에서 사용자 작업 로드
async function loadUserTasks(username) {
    const userFilePath = getUserFilePath(username);
    try {
        const fileData = await fs.promises.readFile(userFilePath, 'utf8');
        return JSON.parse(fileData);
    } catch (error) {
        return [];  // 파일이 없으면 빈 배열을 반환
    }
}

// JSON에 사용자 작업 저장
async function saveUserTasks(username, tasks) {
    const userFilePath = getUserFilePath(username);
    await fs.promises.writeFile(userFilePath, JSON.stringify(tasks, null, 2), 'utf8');
}

// CSV에 작업 저장
async function saveToCsvFile(data) {
    try {
        const writeStream = fs.createWriteStream(csvFilePath, { flags: 'a' });
        const fileStats = await fs.promises.stat(csvFilePath).catch(() => null);

        // 헤더가 없는 경우, 파일이 비어있는지 확인하여 헤더 추가
        const csvStream = fastcsv.format({
            headers: !fileStats || fileStats.size === 0,  // 파일이 비어있으면 헤더 추가
            writeBOM: true,
            quote: '"'
        });

        csvStream.pipe(writeStream);

        const taskData = [
            data.id,
            data.username,
            data.category,
            data.startTime,
            data.elapsedTime,
            data.endTime || '',
            data.quantity || ''
        ];

        csvStream.write(taskData);  // CSV 한 줄 추가

        csvStream.end();
        writeStream.on('finish', () => {
            console.log("✅ CSV 파일에 데이터 저장 완료.");
        });

        writeStream.write("\n");  


    } catch (error) {
        console.error("❌ CSV 저장 오류:", error.message);
    }
}

// 작업 완료 시 처리 (CSV 저장 및 JSON에서 제거)
app.post('/end-task/:username', async (req, res) => {
    try {
        const username = req.params.username;
        const task = req.body;

        // 사용자 파일 존재 여부 확인 및 생성
        await ensureUserFileExists(username);

        // 작업을 CSV 파일에 저장
        await saveToCsvFile(task);

        // JSON 파일에서 해당 작업 제거
        const tasks = await loadUserTasks(username);
        const updatedTasks = tasks.filter(t => t.id !== task.id);

        await saveUserTasks(username, updatedTasks);  // JSON 파일 업데이트
        console.log("✅ Task removed from JSON and saved to CSV successfully.");
        res.send("✅ 작업 완료 및 CSV 저장");
    } catch (error) {
        console.error("❌ 작업 완료 처리 오류:", error.message);
        res.status(400).send(error.message);
    }
});

// POST 요청으로 작업 추가 (JSON 저장)
app.post('/save/:username', async (req, res) => {
    try {
        const username = req.params.username;
        const task = req.body;

        // 사용자 파일 존재 여부 확인 및 생성
        await ensureUserFileExists(username);

        // 사용자 작업 로드 및 추가
        const tasks = await loadUserTasks(username);
        tasks.push(task);

        await saveUserTasks(username, tasks);  // 사용자 파일에 작업 저장
        res.send("✅ 작업 저장 완료");
    } catch (error) {
        console.error("❌ 작업 저장 오류:", error.message);
        res.status(400).send(error.message);
    }
});

// 특정 사용자의 작업 목록 조회
app.get('/tasks/:username', async (req, res) => {
    try {
        const username = req.params.username;

        // 사용자 파일 존재 여부 확인 및 생성
        await ensureUserFileExists(username);

        const tasks = await loadUserTasks(username);
        res.json(tasks);
    } catch (error) {
        console.error("❌ 작업 목록 불러오기 오류:", error.message);
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
app.listen(PORT, () => {
    console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
});
