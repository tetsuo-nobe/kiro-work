# 解答 — ミニクイズ BugFix 体験キット

各バグの原因と修正方法です。まずは自力で挑戦してから見ることをおすすめします。

---

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

---

## 全バグ修正後の app.js（参考）

上記 4 点をすべて反映すると、アプリは README に書かれた「正しい仕様」どおりに動作します。

### バグ同士の関係

- バグ #1（加点されない）を先に直すと、#2（正答率）の症状が確認しやすくなる
- バグ #4（リセット漏れ）は他のバグと独立して再現・修正できる
- おすすめの順序は #1 → #2 → #3 → #4 だが、#4 だけ先に直しても問題ない
