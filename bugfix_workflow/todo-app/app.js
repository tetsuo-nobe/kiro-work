// ToDo リストアプリ
// タスクの状態はこの配列で管理する。各要素は { id, text, done } の形。
let todos = [];

// localStorage の保存キー
const STORAGE_KEY = "bugfix-todo-app";

// DOM 要素の参照
const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const listEl = document.getElementById("todo-list");
const remainingEl = document.getElementById("remaining-count");

// ---- 永続化 ----

// localStorage からタスクを読み込む
function loadTodos() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    todos = JSON.parse(saved);
  }
}

// localStorage へタスクを保存する
function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

// ---- タスク操作 ----

// 新しいタスクを追加する
function addTodo(text) {
  const todo = {
    id: Date.now(),
    text: text,
    done: false,
  };
  todos.push(todo);
  render();
}

// タスクの完了状態を切り替える
function toggleTodo(id) {
  todos.forEach((todo) => {
    if (todo.id === id) {
      todo.done = !todo.done;
    }
  });
  saveTodos();
  render();
}

// タスクを削除する
function deleteTodo(index) {
  todos.splice(index, 1);
  saveTodos();
  render();
}

// ---- 描画 ----

// 残タスク数を更新する
function updateCounter() {
  const remaining = todos.filter((todo) => todo.done).length;
  remainingEl.textContent = remaining;
}

// タスク一覧を描画する
function render() {
  listEl.innerHTML = "";

  // 未完了を上、完了済みを下にして見やすく並べ替える
  const sorted = [...todos].sort((a, b) => a.done - b.done);

  sorted.forEach((todo, index) => {
    const li = document.createElement("li");
    li.className = "todo-item";
    if (todo.done) {
      li.classList.add("done");
    }

    // 完了チェックボックス
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.done;
    checkbox.addEventListener("change", () => toggleTodo(todo.id));

    // タスクテキスト
    const span = document.createElement("span");
    span.className = "text";
    span.textContent = todo.text;

    // 削除ボタン
    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.textContent = "×";
    delBtn.addEventListener("click", () => deleteTodo(index));

    li.appendChild(checkbox);
    li.appendChild(span);
    li.appendChild(delBtn);
    listEl.appendChild(li);
  });

  updateCounter();
}

// ---- イベント登録 ----

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value;
  addTodo(text);
  input.value = "";
});

// 初期化
loadTodos();
render();
