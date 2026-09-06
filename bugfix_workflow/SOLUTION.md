# 解答 — BugFix workflow 体験キット

3 つの練習用アプリ（ToDo リスト / 電卓 / ミニクイズ）に仕込まれたバグの原因と修正方法を集約した解答集です。まずは自力で挑戦してから見ることをおすすめします。

> このドキュメントは、3 つのアプリ（`todo-app/` `calculator/` `quiz/`）の解答を集約したものです。各アプリの仕様やバグの再現手順は [`README.md`](./README.md) を参照してください。

## 目次

- [1. ToDo リスト（todo-app）](#1-todo-リストtodo-app)
- [2. 電卓（calculator）](#2-電卓calculator)
- [3. ミニクイズ（quiz）](#3-ミニクイズquiz)

---

# 1. ToDo リスト（todo-app）

各バグの原因と修正方法です。（全 5 個。うち 1 つは上級）

## バグ #1 空欄でもタスクが追加できてしまう

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

## バグ #2 「残り N 件」の数がおかしい

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

## バグ #3 リロードするとタスクが消える

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

## バグ #4 削除すると意図しないタスクが消える

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

## バグ #5 連続追加で id が重複し、複数タスクがまとめて完了になる

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

## 全バグ修正後の app.js（todo-app・参考）

上記 5 点をすべて反映すると、アプリは README に書かれた「正しい仕様」どおりに動作します。

なお、バグ #5（id 重複）を方法 A/B のどちらで直しても、
バグ #4（削除の id 化）が正しく機能する前提になります。
#4 と #5 は「id を一意な識別子として正しく使う」という同じテーマにつながっています。

---

# 2. 電卓（calculator）

各バグの原因と修正方法です。（全 4 個）

## バグ #1 「C」を押しても完全にリセットされない

### 原因

`clearAll` が入力途中の数値（`currentInput`）だけを空にしていて、
ためこんだトークン列（`tokens`）を消していない。
そのため「C」後も `5 +` のような計算途中の状態が内部に残る。

```js
function clearAll() {
  currentInput = "";   // ← tokens が残ったまま
  updateDisplay();
}
```

### 修正

`tokens` も空配列に戻す。

```js
function clearAll() {
  tokens = [];
  currentInput = "";
  updateDisplay();
}
```

---

## バグ #2 演算子を連続で押すと壊れる

### 原因

`inputOperator` は、入力途中の数値があるときだけ数値を確定するが、
数値がなくても演算子は無条件に積んでしまう。
その結果 `tokens` が `["5", "+", "*"]` のように「演算子が連続する」壊れた列になり、
`calculate` の中で `Number("*")` が `NaN` になる。

```js
function inputOperator(op) {
  if (currentInput !== "") {
    tokens.push(currentInput);
    currentInput = "";
  }
  tokens.push(op);   // ← 直前が演算子でも積んでしまう
  updateDisplay();
}
```

### 修正

直前のトークンが演算子だった場合は、新しく積まずに **最後の演算子を上書き** する。

```js
function inputOperator(op) {
  if (currentInput !== "") {
    tokens.push(currentInput);
    currentInput = "";
  }

  const last = tokens[tokens.length - 1];
  const isOperator = (t) => t === "+" || t === "-" || t === "*" || t === "/";

  // まだ何も入力されていない場合は演算子を受け付けない
  if (tokens.length === 0) {
    return;
  }

  // 直前が演算子なら、それを新しい演算子で置き換える
  if (isOperator(last)) {
    tokens[tokens.length - 1] = op;
  } else {
    tokens.push(op);
  }

  updateDisplay();
}
```

これで `5 + * 3 =` は「＋ を × に置き換え」て `5 * 3 = 15` になる。

---

## バグ #3 小数の計算結果がおかしくなる

### 原因

浮動小数点（IEEE 754）の性質で `0.1 + 0.2` は厳密には `0.3` にならず
`0.30000000000000004` になる。計算結果を丸めずにそのまま表示しているのが原因。

```js
function equals() {
  // ...
  const result = calculate(tokens);
  displayEl.textContent = result;   // ← 丸めずに表示
  tokens = [String(result)];
}
```

### 修正

表示時に適度な桁で丸める。`Number.prototype.toPrecision` を使い、
末尾の余分な 0 を落とすと自然に表示できる。

```js
function formatResult(value) {
  // 有効数字 12 桁で丸め、指数表記や余分な 0 を整理する
  return Number(value.toPrecision(12)).toString();
}

function equals() {
  // ...
  const result = calculate(tokens);
  const shown = formatResult(result);
  displayEl.textContent = shown;
  tokens = [String(result)]; // 次の計算には丸め前の値を使ってもよい
}
```

> `Math.round(value * 1e12) / 1e12` のような方法でも同様に丸められる。
> 電卓としてどの桁で丸めるかは仕様次第だが、初学者にはまず
> 「浮動小数点はそのまま表示してはいけない」という気づきが大切。

---

## バグ #4 計算の優先順位が違う

### 原因

`calculate` が演算子の種類を区別せず、配列を **前から順番に** 計算している。
そのため `2 + 3 * 4` が `((2 + 3) * 4)` として評価され `20` になる。

```js
function calculate(tokenList) {
  let result = Number(tokenList[0]);
  for (let i = 1; i < tokenList.length; i += 2) {
    const op = tokenList[i];
    const next = Number(tokenList[i + 1]);
    if (op === "+") result = result + next;
    else if (op === "-") result = result - next;
    else if (op === "*") result = result * next;  // ← 先に処理されない
    else if (op === "/") result = result / next;
  }
  return result;
}
```

### 修正

2 段階で評価する。まず `*` と `/` を先に処理して列を縮め、
残った `+` と `-` を左から処理する。

```js
function calculate(tokenList) {
  // トークン列をコピー（元を壊さない）
  const tokens = tokenList.slice();

  // --- 第1段階: * と / を先に処理 ---
  const afterMulDiv = [Number(tokens[0])];
  for (let i = 1; i < tokens.length; i += 2) {
    const op = tokens[i];
    const next = Number(tokens[i + 1]);
    if (op === "*") {
      afterMulDiv[afterMulDiv.length - 1] *= next;
    } else if (op === "/") {
      afterMulDiv[afterMulDiv.length - 1] /= next;
    } else {
      // + / - はいったんそのまま残す
      afterMulDiv.push(op, next);
    }
  }

  // --- 第2段階: 残った + と - を左から処理 ---
  let result = afterMulDiv[0];
  for (let i = 1; i < afterMulDiv.length; i += 2) {
    const op = afterMulDiv[i];
    const next = afterMulDiv[i + 1];
    if (op === "+") result += next;
    else if (op === "-") result -= next;
  }

  return result;
}
```

これで `2 + 3 * 4` は `3 * 4 = 12` を先に計算し、`2 + 12 = 14` になる。

## 全バグ修正後の app.js（calculator・参考）

上記 4 点をすべて反映すると、アプリは README に書かれた「正しい仕様」どおりに動作します。

### 修正の相互関係

- バグ #2 の修正（演算子の上書き）は、バグ #4 の修正（優先順位計算）が
  正しいトークン列を前提にしているため、両方直すとより安定する
- バグ #3 の丸めは表示だけの問題なので、他のバグと独立して直せる

---

# 3. ミニクイズ（quiz）

各バグの原因と修正方法です。（全 4 個）

## バグ #1 正解を選んでもスコアが増えない

### 原因

選択肢ボタンのクリックハンドラが、`btn.dataset.index`（**文字列**）を
`selectAnswer` に渡している。一方 `q.answer` は **数値**。
`===`（厳密等価）は型が違うと一致しないため、`"1" === 1` は常に `false` になり、
正解しても加点されない。

```js
btn.dataset.index = index;
btn.addEventListener("click", () => selectAnswer(btn.dataset.index)); // ← 文字列を渡している

// ...

function selectAnswer(choiceIndex) {
  const q = questions[currentIndex];
  if (choiceIndex === q.answer) {  // "1" === 1 → false
    score += 1;
  }
  // ...
}
```

### 修正

数値を渡すようにする。いずれかの方法でよい。

**方法 A: そもそも数値の `index` を渡す（おすすめ）**

```js
btn.addEventListener("click", () => selectAnswer(index));
```

**方法 B: 受け取り側で数値に変換する**

```js
function selectAnswer(choiceIndex) {
  const q = questions[currentIndex];
  if (Number(choiceIndex) === q.answer) {
    score += 1;
  }
  // ...
}
```

> 教訓: DOM の `dataset` から取り出した値は **常に文字列**。数値として比較・計算する
> ときは変換が必要。`===` は型に厳しいので、こうした取り違えが表面化しやすい。

---

## バグ #2 正答率がいつも 0% になる

### 原因

正答率の計算式のカッコの位置が誤っている。
`score / (questions.length * 100)` は「得点 ÷ (問題数 × 100)」となり、
100 倍すべきものを逆に割ってしまっている。4 問中 4 問正解でも
`4 / (4 * 100) = 0.01` → 四捨五入で `0`。

```js
const rate = Math.round(score / (questions.length * 100)); // ← カッコの位置が誤り
```

### 修正

「得点 ÷ 問題数 × 100」の順に計算する。

```js
const rate = Math.round((score / questions.length) * 100);
```

---

## バグ #3 最後の問題が出題されない

### 原因

次の問題へ進む条件が `currentIndex < questions.length - 1` になっている。
`- 1` があるため、最後の 1 問に到達する前に結果画面へ進んでしまう。
典型的なオフバイワン（境界の 1 個ずれ）エラー。

例（全 4 問）: 第 3 問（`currentIndex` は回答後に `3`）で
`3 < 4 - 1` → `3 < 3` → `false` となり、第 4 問を表示せず結果へ飛ぶ。

```js
currentIndex += 1;
if (currentIndex < questions.length - 1) {  // ← - 1 が余計
  renderQuestion();
} else {
  renderResult();
}
```

### 修正

`- 1` を外す。`currentIndex` が問題数に達したら結果、それ未満なら次の問題。

```js
currentIndex += 1;
if (currentIndex < questions.length) {
  renderQuestion();
} else {
  renderResult();
}
```

---

## バグ #4 「もう一度」を押しても最初からやり直せない

### 原因

`retry` が画面の切り替え（結果画面を隠してクイズ画面を表示）はしているが、
進行を管理する状態変数 `currentIndex` と `score` を **どちらも初期値に戻していない**。
そのため「もう一度」を押しても、最後の問題番号のまま・前回のスコアのまま再開してしまう。

```js
function retry() {
  // ← currentIndex も score も戻していない
  resultView.classList.add("hidden");
  quizView.classList.remove("hidden");
  renderQuestion();   // currentIndex が最後のままなので最後の問題が表示される
}
```

### 修正

`currentIndex` と `score` の両方を初期値に戻す。

```js
function retry() {
  currentIndex = 0;
  score = 0;
  resultView.classList.add("hidden");
  quizView.classList.remove("hidden");
  renderQuestion();
}
```

> 教訓: 「状態」が複数の変数に分かれているとき、リセット処理では **その全部** を
> 戻す必要がある。片方だけ戻すと、中途半端な状態から再開してしまう。
> このアプリでは進行状態が `currentIndex` と `score` の 2 つに分かれていた。

## 全バグ修正後の app.js（quiz・参考）

上記 4 点をすべて反映すると、アプリは README に書かれた「正しい仕様」どおりに動作します。

### バグ同士の関係

- バグ #1（加点されない）を先に直すと、#2（正答率）の症状が確認しやすくなる
- バグ #4（リセット漏れ）は他のバグと独立して再現・修正できる
- おすすめの順序は #1 → #2 → #3 → #4 だが、#4 だけ先に直しても問題ない
