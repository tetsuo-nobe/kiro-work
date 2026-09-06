// シンプルな電卓アプリ
//
// 入力された数値と演算子を「トークン列」として tokens 配列にためていき、
// 「＝」を押したタイミングでまとめて計算する方式。
// 例: 2 + 3 × 4  →  tokens = ["2", "+", "3", "*", "4"]

// これまでに入力されたトークン（数値・演算子）の列
let tokens = [];

// いま入力途中の数値（文字列でためる。小数点も文字として扱う）
let currentInput = "";

// DOM 要素
const displayEl = document.getElementById("display");

// ---- 表示 ----

// ディスプレイを更新する
function updateDisplay() {
  // 入力途中の数値があればそれを、なければ直前のトークンを表示する
  if (currentInput !== "") {
    displayEl.textContent = currentInput;
  } else if (tokens.length > 0) {
    displayEl.textContent = tokens[tokens.length - 1];
  } else {
    displayEl.textContent = "0";
  }
}

// ---- 入力処理 ----

// 数字（および小数点）が押されたとき
function inputNumber(num) {
  currentInput += num;
  updateDisplay();
}

// 演算子が押されたとき
function inputOperator(op) {
  // 入力途中の数値があれば確定してトークンに積む
  if (currentInput !== "") {
    tokens.push(currentInput);
    currentInput = "";
  }
  // 演算子をトークンに積む
  tokens.push(op);
  updateDisplay();
}

// クリア（C）が押されたとき
function clearAll() {
  currentInput = "";
  updateDisplay();
}

// ---- 計算 ----

// tokens 配列を左から順に計算して結果を返す
function calculate(tokenList) {
  let result = Number(tokenList[0]);

  for (let i = 1; i < tokenList.length; i += 2) {
    const op = tokenList[i];
    const next = Number(tokenList[i + 1]);

    if (op === "+") {
      result = result + next;
    } else if (op === "-") {
      result = result - next;
    } else if (op === "*") {
      result = result * next;
    } else if (op === "/") {
      result = result / next;
    }
  }

  return result;
}

// 「＝」が押されたとき
function equals() {
  // 入力途中の数値があれば確定
  if (currentInput !== "") {
    tokens.push(currentInput);
    currentInput = "";
  }

  if (tokens.length === 0) {
    return;
  }

  const result = calculate(tokens);

  // 結果を表示し、次の計算に備えて result を起点にする
  displayEl.textContent = result;
  tokens = [String(result)];
}

// ---- イベント登録 ----

document.querySelector(".buttons").addEventListener("click", (e) => {
  const target = e.target;
  if (!target.classList.contains("btn")) {
    return;
  }

  if (target.dataset.num !== undefined) {
    inputNumber(target.dataset.num);
  } else if (target.dataset.op !== undefined) {
    inputOperator(target.dataset.op);
  } else if (target.dataset.action === "clear") {
    clearAll();
  } else if (target.dataset.action === "equals") {
    equals();
  }
});

updateDisplay();
