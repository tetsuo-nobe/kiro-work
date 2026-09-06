# 解答 — ToDo リスト BugFix 体験キット

各バグの原因と修正方法です。まずは自力で挑戦してから見ることをおすすめします。

---

## バグ #1 空欄でもタスクが追加できてしまう ★☆☆

### 原因

`form` の submit ハンドラが、入力値を検証せずにそのまま `addTodo` へ渡している。
空文字や空白だけの文字列でもタスクが作られてしまう。

```js
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value;   // ← 検証していない
  addTodo(text);
  input.value = "";
});
```

### 修正

前後の空白を除去したうえで、空なら何もせず return する。

```js
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (text === "") {
    return;
  }
  addTodo(text);
  input.value = "";
});
```

---

## バグ #2 「残り N 件」の数がおかしい ★☆☆

### 原因

`updateCounter` が「完了済み（`todo.done` が true）」のタスクを数えている。
本来「残り」は未完了タスクの数。条件が逆になっている。

```js
function updateCounter() {
  const remaining = todos.filter((todo) => todo.done).length; // ← 完了を数えている
  remainingEl.textContent = remaining;
}
```

### 修正

`!todo.done`（未完了）を数えるようにする。

```js
function updateCounter() {
  const remaining = todos.filter((todo) => !todo.done).length;
  remainingEl.textContent = remaining;
}
```

---

## バグ #3 リロードするとタスクが消える ★★☆

### 原因

`addTodo` の中で `saveTodos()` を呼んでいない。
`toggleTodo` と `deleteTodo` は保存しているため、「追加だけ保存されない」状態になっている。

```js
function addTodo(text) {
  const todo = { id: Date.now(), text: text, done: false };
  todos.push(todo);
  render();          // ← saveTodos() がない
}
```

### 修正

`render()` の前（または後）に `saveTodos()` を追加する。

```js
function addTodo(text) {
  const todo = { id: Date.now(), text: text, done: false };
  todos.push(todo);
  saveTodos();
  render();
}
```

---

## バグ #4 削除すると意図しないタスクが消える ★★★

### 原因

`render` では「未完了を上・完了を下」に並べ替えた **表示用の配列（`sorted`）** を作り、
その並べ替え後の位置（index）を削除ボタンに渡している。
一方 `deleteTodo` は、その index を **元の配列（`todos`）** に対して `splice` している。

並べ替えによって「表示上の位置」と「元データの位置」がズレているため、
完了タスクが混ざって並びが変わると、削除対象がずれて別のタスクが消える。
可変な index（しかも別配列の index）に依存しているのが根本原因。

```js
function render() {
  listEl.innerHTML = "";

  // 表示用に並べ替えた配列。todos とは並び順が異なる
  const sorted = [...todos].sort((a, b) => a.done - b.done);

  sorted.forEach((todo, index) => {
    // ...
    // sorted 上の index を渡している（todos の index とは一致しない）
    delBtn.addEventListener("click", () => deleteTodo(index));
    // ...
  });
}

function deleteTodo(index) {
  todos.splice(index, 1); // ← todos に対して sorted の index で splice している
  saveTodos();
  render();
}
```

### 修正

index ではなく一意な `id` を使う。削除ボタンには `todo.id` を渡し、
`deleteTodo` は `filter` で該当 id 以外を残す。これで並べ替えの影響を受けなくなる。

```js
function render() {
  listEl.innerHTML = "";
  const sorted = [...todos].sort((a, b) => a.done - b.done);

  sorted.forEach((todo) => {
    // ...
    delBtn.addEventListener("click", () => deleteTodo(todo.id));
    // ...
  });
}

function deleteTodo(id) {
  todos = todos.filter((todo) => todo.id !== id);
  saveTodos();
  render();
}
```

> 補足: 並べ替え（`sort`）自体は正しい仕様なので残してよい。
> 問題は「並べ替えた配列の位置」で元データを操作していた点にある。

---

## バグ #5 連続追加で id が重複し、複数タスクがまとめて完了になる ★★★（上級）

### 原因

`addTodo` がタスクの `id` に `Date.now()`（現在時刻のミリ秒）を使っている。
`Date.now()` はミリ秒単位のため、**同一ミリ秒内に複数追加すると同じ id** になる。

```js
function addTodo(text) {
  const todo = {
    id: Date.now(),   // ← 同じミリ秒に追加すると id が衝突する
    text: text,
    done: false,
  };
  todos.push(todo);
  render();
}
```

`toggleTodo` と `deleteTodo` は `id` で対象を探すため、id が重複していると
「1 件のつもりが、同じ id を持つ複数タスクすべて」に作用してしまう。

```js
function toggleTodo(id) {
  todos.forEach((todo) => {
    if (todo.id === id) {      // 同じ id が複数あると全部ヒットする
      todo.done = !todo.done;
    }
  });
  // ...
}
```

手動操作では追加の間隔が空くため踏みにくいが、プログラムから一気に追加すると再現する
タイミング依存のバグ。

### 修正

id が必ず一意になるようにする。代表的な方法は次のいずれか。

**方法 A: 単調増加のカウンターを使う（シンプルで確実）**

```js
let nextId = 1;

function addTodo(text) {
  const todo = {
    id: nextId++,
    text: text,
    done: false,
  };
  todos.push(todo);
  saveTodos();
  render();
}
```

> 注意: localStorage から読み込んで再開する場合は、既存タスクの最大 id + 1 から
> `nextId` を始めると、リロード後の id 衝突も防げる。
>
> ```js
> function loadTodos() {
>   const saved = localStorage.getItem(STORAGE_KEY);
>   if (saved) {
>     todos = JSON.parse(saved);
>     nextId = todos.reduce((max, t) => Math.max(max, t.id), 0) + 1;
>   }
> }
> ```

**方法 B: `crypto.randomUUID()` を使う（衝突しない一意な文字列）**

```js
function addTodo(text) {
  const todo = {
    id: crypto.randomUUID(),
    text: text,
    done: false,
  };
  todos.push(todo);
  saveTodos();
  render();
}
```

どちらでも解決するが、初学者には「なぜ `Date.now()` だと衝突するのか」を理解したうえで
方法 A（カウンター）を選ぶのが分かりやすい。

---

## 全バグ修正後の app.js（参考）

上記 5 点をすべて反映すると、アプリは README に書かれた「正しい仕様」どおりに動作します。

なお、バグ #5（id 重複）を方法 A/B のどちらで直しても、
バグ #4（削除の id 化）が正しく機能する前提になります。
#4 と #5 は「id を一意な識別子として正しく使う」という同じテーマにつながっています。
