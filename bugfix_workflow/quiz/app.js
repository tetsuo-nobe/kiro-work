// ミニクイズアプリ
//
// questions の問題を 1 問ずつ表示し、選択肢を選ぶと次の問題へ進む。
// 全問終わるとスコアと正答率を結果画面に表示する。

// 問題データ
// answer は choices の何番目が正解かを表すインデックス（0 始まり）
const questions = [
  {
    text: "日本の首都はどこ？",
    choices: ["大阪", "東京", "京都", "札幌"],
    answer: 1,
  },
  {
    text: "1 + 1 = ?",
    choices: ["1", "2", "3", "11"],
    answer: 1,
  },
  {
    text: "水の化学式は？",
    choices: ["CO2", "O2", "H2O", "NaCl"],
    answer: 2,
  },
  {
    text: "1 年は何日？（平年）",
    choices: ["365 日", "366 日", "360 日", "364 日"],
    answer: 0,
  },
];

// 現在の問題インデックスと得点
let currentIndex = 0;
let score = 0;

// DOM 要素
const quizView = document.getElementById("quiz-view");
const resultView = document.getElementById("result-view");
const currentNumberEl = document.getElementById("current-number");
const totalNumberEl = document.getElementById("total-number");
const questionTextEl = document.getElementById("question-text");
const choicesEl = document.getElementById("choices");

const scoreEl = document.getElementById("score");
const totalResultEl = document.getElementById("total-result");
const rateEl = document.getElementById("rate");
const retryBtn = document.getElementById("retry-btn");

// ---- 描画 ----

// 現在の問題を描画する
function renderQuestion() {
  const q = questions[currentIndex];

  currentNumberEl.textContent = currentIndex + 1;
  totalNumberEl.textContent = questions.length;
  questionTextEl.textContent = q.text;

  // 選択肢ボタンを作る
  choicesEl.innerHTML = "";
  q.choices.forEach((choice, index) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    btn.textContent = choice;
    btn.dataset.index = index;
    btn.addEventListener("click", () => selectAnswer(btn.dataset.index));
    li.appendChild(btn);
    choicesEl.appendChild(li);
  });
}

// 結果画面を描画する
function renderResult() {
  quizView.classList.add("hidden");
  resultView.classList.remove("hidden");

  scoreEl.textContent = score;
  totalResultEl.textContent = questions.length;

  // 正答率（%）を計算する
  const rate = Math.round(score / (questions.length * 100));
  rateEl.textContent = rate;
}

// ---- 回答処理 ----

// 選択肢が選ばれたとき
function selectAnswer(choiceIndex) {
  const q = questions[currentIndex];

  // 正解かどうか判定して加点する
  if (choiceIndex === q.answer) {
    score += 1;
  }

  // 次の問題へ進む
  currentIndex += 1;

  if (currentIndex < questions.length - 1) {
    renderQuestion();
  } else {
    renderResult();
  }
}

// 「もう一度」が押されたとき
function retry() {
  resultView.classList.add("hidden");
  quizView.classList.remove("hidden");
  renderQuestion();
}

// ---- 初期化 ----

retryBtn.addEventListener("click", retry);
renderQuestion();
