# 나만의 메모장 (Notion-like Notepad)

내 PC를 서버로 사용해서 노션처럼 페이지를 계층적으로 만들고, 블록 단위로 글을 쓰는 메모장 웹앱입니다.

## 구조

일반적인 웹앱 개발 구조를 따릅니다.

```
.
├── backend/     # Node.js + Express + SQLite (REST API 서버)
│   ├── src/
│   │   ├── server.js       # 서버 진입점
│   │   ├── db.js           # SQLite 연결 및 스키마
│   │   └── routes/pages.js # 페이지 CRUD API
│   └── data/                # SQLite 데이터 파일 (git에는 커밋되지 않음)
└── frontend/    # React + Vite (SPA)
    └── src/
        ├── App.jsx              # 전체 레이아웃, 상태 관리
        ├── api.js                # 백엔드 REST API 클라이언트
        └── components/
            ├── Sidebar.jsx       # 페이지 트리 (하위 페이지 지원)
            ├── Editor.jsx        # 블록 에디터 로직
            └── Block.jsx         # 블록 하나(문단/제목/목록/할일)
```

- **데이터**: 모든 페이지는 SQLite(`backend/data/notepad.db`)에 저장됩니다. 브라우저를 새로고침하거나 다른 기기에서 접속해도 같은 내용을 볼 수 있습니다.
- **에디터**: 노션처럼 블록 단위로 편집합니다. 지원하는 단축 입력:
  - `# ` → 제목 1
  - `## ` → 제목 2
  - `- ` 또는 `* ` → 글머리 기호 목록
  - `[] ` → 할 일(체크박스)
  - `Enter`로 블록 분리/추가, 빈 줄에서 `Backspace`로 이전 블록과 병합

## 실행 방법 (내 PC를 서버로 사용하기)

### 1. 백엔드 서버 실행

```bash
cd backend
npm install
npm run dev
```

기본적으로 `http://0.0.0.0:4000` 에서 실행되어, 같은 네트워크의 다른 기기에서도 PC의 IP로 접속할 수 있습니다.

### 2. 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

`http://localhost:5173` 에서 접속하면 됩니다. (`--host` 옵션이 켜져 있어 `http://<내 PC의 로컬 IP>:5173` 로도 접속 가능합니다.)

### 3. 다른 기기(휴대폰, 다른 컴퓨터)에서 접속하기

1. PC의 로컬 IP를 확인합니다. (예: `ifconfig` / `ipconfig` → `192.168.0.x`)
2. 같은 Wi-Fi에 연결된 기기에서 `http://192.168.0.x:5173` 로 접속합니다.
3. 프론트엔드가 백엔드 API를 호출할 때는 Vite의 프록시(`/api` → `http://localhost:4000`)를 사용하므로 별도 설정 없이 바로 동작합니다.

### 프로덕션처럼 계속 켜두고 싶다면

```bash
cd frontend && npm run build   # dist/ 생성
cd ../backend
# express에 정적 파일 서빙을 추가하거나, nginx 등으로 dist/를 서빙하고
# /api 요청만 backend(4000번 포트)로 넘기면 됩니다.
```

또는 `pm2`, `systemd` 같은 프로세스 매니저로 `backend/src/server.js`를 상시 실행시켜 두면 PC가 켜져 있는 동안 계속 서버로 사용할 수 있습니다.

## API

| Method | Path              | 설명                              |
| ------ | ----------------- | --------------------------------- |
| GET    | `/api/pages`       | 전체 페이지 목록(트리 구성용)      |
| GET    | `/api/pages/:id`   | 페이지 상세(블록 내용 포함)        |
| POST   | `/api/pages`       | 새 페이지 생성 (`title`, `parentId`) |
| PUT    | `/api/pages/:id`   | 제목/아이콘/내용/부모 변경         |
| DELETE | `/api/pages/:id`   | 페이지 및 하위 페이지 전체 삭제    |
