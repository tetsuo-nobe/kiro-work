# 解答 — 電卓 BugFix 体験キット

各バグの原因と修正方法です。まずは自力で挑戦してから見ることをおすすめします。

---

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

---

## 全バグ修正後の app.js（参考）

上記 4 点をすべて反映すると、アプリは README に書かれた「正しい仕様」どおりに動作します。

### 修正の相互関係

- バグ #2 の修正（演算子の上書き）は、バグ #4 の修正（優先順位計算）が
  正しいトークン列を前提にしているため、両方直すとより安定する
- バグ #3 の丸めは表示だけの問題なので、他のバグと独立して直せる
