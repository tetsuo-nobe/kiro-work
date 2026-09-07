# 残り件数の誤表示 Bugfix Design

## Overview

ToDo リストアプリ（`bugfix_workflow/todo-app`）の「残り N 件」カウンターが、未完了タスク数ではなく完了タスク数を表示しているバグを修正する。原因は `updateCounter` 関数が `todos.filter((todo) => todo.done).length`（完了数）を数えている点にある。修正方針は、この判定を `!todo.done`（未完了）に変えて未完了タスク数を数えるようにすることであり、変更は 1 行に限定される。カウンター表示以外の振る舞い（タスク追加、空入力抑制、完了トグル、削除、localStorage 永続化）は一切変更しない。

## Glossary

- **Bug_Condition (C)**: 「残り」に表示される値（現行実装では完了タスク数）が、本来表示すべき未完了タスク数と一致しない状態。
- **Property (P)**: 「残り N 件」が常に未完了（`done` が false）タスクの件数を表示するという、修正後に満たすべき振る舞い。
- **Preservation**: カウンター表示以外の既存の振る舞い（タスク追加、空入力抑制、完了トグル、削除、永続化）が変更されないこと。
- **updateCounter**: `bugfix_workflow/todo-app/app.js` 内の関数で、`todos` 配列から件数を数えて `remaining-count` 要素の表示テキストを更新する。
- **todos**: `{ id, text, done }` を要素とする配列で、アプリのタスク状態を保持する。`done` が true なら完了、false なら未完了。

## Bug Details

### Bug Condition

このバグは、`updateCounter` が「残り」の値として未完了タスク数ではなく完了タスク数を数えていることで顕在化する。具体的には、`todos.filter((todo) => todo.done).length` によって `done === true` のタスク（完了済み）を数えており、本来数えるべき `done === false` のタスク（未完了）を数えていない。その結果、未完了数と完了数が異なるすべての状態で誤った件数が表示される。

**Formal Specification:**
```
FUNCTION isBugCondition(X)
  INPUT: X of type TodoList
  OUTPUT: boolean

  // 「残り」に表示される値が未完了タスク数と一致しない状況を検出する。
  // 現行実装は完了タスク数を数えているため、未完了数と完了数が
  // 異なるすべての状態でバグが顕在化する。
  RETURN countIncomplete(X) <> countComplete(X)
END FUNCTION
```

### Examples

- タスクを 3 件追加し 1 件を完了にする → 未完了は 2 件だが「残り 1 件」と表示される（期待: 2、実際: 1）
- タスクを 2 件追加しどちらも完了にする → 未完了は 0 件だが「残り 2 件」と表示される（期待: 0、実際: 2）
- タスクを 3 件追加しすべて未完了のまま → 未完了は 3 件だが完了数は 0 のため「残り 0 件」と表示される（期待: 3、実際: 0）
- タスクを 4 件追加し 2 件を完了にする → 未完了は 2 件、完了も 2 件で偶然一致するため「残り 2 件」と表示される（このケースは `isBugCondition` が false で、誤表示は起きない）

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- 入力欄にテキストを入れて「追加」を押すとタスクが追加される（3.1）
- 空欄のまま「追加」を押してもタスクは追加されず状態も変化しない（空入力抑制、3.2）
- チェックボックス操作でタスクの完了／未完了が切り替わる（3.3）
- 「×」ボタンでそのタスクだけが削除される（3.4）
- ブラウザをリロードしてもタスクが localStorage から復元される（3.5）

**Scope:**
バグ条件（`updateCounter` が数える対象）に関わらない入力・操作は本修正の影響を一切受けない。具体的には次を含む。
- タスクの追加・削除・トグルといった `todos` 配列の更新ロジック
- 空入力時の抑制と視覚的フィードバック（`showInputFeedback`）
- localStorage への保存・読み込み（`saveTodos` / `loadTodos`）
- タスク一覧の描画・並べ替え（`render` の DOM 構築部分）

## Hypothesized Root Cause

バグの記述とコードの確認により、原因は特定済みである。

1. **カウント対象の述語ミス（確定）**: `updateCounter` 内の `todos.filter((todo) => todo.done).length` が、完了タスク（`done === true`）を数えている。「残り」＝未完了件数を表示すべきなので、述語は `!todo.done`（`done === false`）でなければならない。

2. **表示要素の取り違えではない**: `remainingEl`（`remaining-count`）への代入自体は正しく、参照している DOM 要素も正しい。問題は代入する値の計算のみに存在する。

3. **描画呼び出しタイミングの問題ではない**: `updateCounter` は `render` の末尾で呼ばれ、`toggleTodo` / `addTodo` / `deleteTodo` はいずれも `render` を通る。カウンターの更新タイミングは正しく、値の計算だけが誤っている。

## Correctness Properties

Property 1: Bug Condition - 残り件数は未完了タスク数と一致する

_For any_ タスク状態 X においてバグ条件が成立する（isBugCondition が true を返す、すなわち未完了数と完了数が異なる）とき、修正後の updateCounter は「残り」の値として未完了（`done` が false）タスクの件数 `countIncomplete(X)` を表示する SHALL。

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - カウンター以外の振る舞いは不変

_For any_ 入力・操作において、バグ条件に関与しない振る舞い（タスク追加、空入力抑制、完了トグル、削除、localStorage 永続化）について、修正後のコードは修正前のコードと同一の結果を生成する SHALL。カウンター表示以外の状態遷移・DOM 構築・永続化はすべて維持される。

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

根本原因の分析が正しいことを前提とする。

**File**: `bugfix_workflow/todo-app/app.js`

**Function**: `updateCounter`

**Specific Changes**:
1. **カウント述語の反転**: `todos.filter((todo) => todo.done).length` を `todos.filter((todo) => !todo.done).length` に変更し、未完了（`done === false`）タスクを数えるようにする。
   - 変更前:
     ```javascript
     function updateCounter() {
       const remaining = todos.filter((todo) => todo.done).length;
       remainingEl.textContent = remaining;
     }
     ```
   - 変更後:
     ```javascript
     function updateCounter() {
       // 「残り」は未完了（done が false）タスクの件数を表示する
       const remaining = todos.filter((todo) => !todo.done).length;
       remainingEl.textContent = remaining;
     }
     ```

2. **変更範囲の限定**: 修正は上記 1 行（フィルタ述語）のみ。`remainingEl` への代入、変数名、その他の関数には手を加えない。これによりカウンター以外の振る舞いへの副作用を排除する。

## Testing Strategy

### Validation Approach

テストは 2 段階で進める。まず未修正コードに対してバグを再現する反例を surface させ、次に修正が正しく機能し既存の振る舞いを保つことを検証する。

### Exploratory Bug Condition Checking

**Goal**: 修正前に、バグを再現する反例を surface させる。根本原因の分析（完了数を数えている）を確認または反証する。反証された場合は再仮説を立てる。

**Test Plan**: 複数のタスクを追加し一部を完了状態にしたうえで、`remaining-count` の表示値が未完了件数と一致するかを検証するテストを書く。まず未修正コードで実行し、表示値が完了件数になっていること（＝失敗）を観測する。

**Test Cases**:
1. **一部完了テスト**: 3 件追加し 1 件を完了 → 「残り」が 2 であることを期待（未修正コードでは 1 となり失敗）
2. **全件完了テスト**: 2 件追加し全件完了 → 「残り」が 0 であることを期待（未修正コードでは 2 となり失敗）
3. **全件未完了テスト**: 3 件追加し完了なし → 「残り」が 3 であることを期待（未修正コードでは 0 となり失敗）
4. **エッジケース（偶然一致）**: 4 件追加し 2 件完了 → 未完了 2・完了 2 で表示は偶然一致するため、このケースはバグ条件を満たさない（未修正でも成功しうる）

**Expected Counterexamples**:
- 「残り」に完了件数が表示され、未完了件数と一致しない
- 想定される原因: `updateCounter` のフィルタ述語が `todo.done`（完了）になっている

### Fix Checking

**Goal**: バグ条件が成立するすべての入力について、修正後の関数が期待される振る舞い（未完了件数の表示）を満たすことを検証する。

**Pseudocode:**
```
FOR ALL X WHERE isBugCondition(X) DO
  result := updateCounter_fixed(X)
  ASSERT result = countIncomplete(X)
END FOR
```

### Preservation Checking

**Goal**: バグ条件が成立しないすべての入力について、修正後の関数が修正前の関数と同一の結果を生成することを検証する。

**Pseudocode:**
```
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT updateCounter_original(X) = updateCounter_fixed(X)
END FOR
```

**Testing Approach**: 保全チェックにはプロパティベーステストが適している。
- 入力領域全体にわたり多数のテストケースを自動生成できる
- 手動のユニットテストでは見落としがちなエッジケースを捕捉できる
- 非バグ入力に対して振る舞いが不変であることを強く保証できる

**Test Plan**: まず未修正コードでタスク追加・空入力抑制・トグル・削除・永続化の振る舞いを観測し、その振る舞いを固定するプロパティベーステストを書く。

**Test Cases**:
1. **タスク追加の保全**: 未修正コードでテキスト追加が機能することを観測し、修正後も維持されることを検証する
2. **空入力抑制の保全**: 未修正コードで空送信時に追加されず状態不変であることを観測し、修正後も維持されることを検証する
3. **完了トグル・削除の保全**: 未修正コードでトグルと削除が該当タスクのみに作用することを観測し、修正後も維持されることを検証する
4. **永続化の保全**: 未修正コードで localStorage への保存・復元が機能することを観測し、修正後も維持されることを検証する

### Unit Tests

- 各タスク状態（一部完了・全件完了・全件未完了・空リスト）で「残り」表示が未完了件数と一致することを検証する
- 空リスト時に「残り」が 0 であることを検証する
- カウンター更新後もタスク追加・削除・トグルが機能することを検証する

### Property-Based Tests

- ランダムなタスク集合と完了フラグを生成し、「残り」表示が常に未完了件数と一致することを検証する（Fix Checking）
- ランダムな操作列を生成し、カウンター以外の状態（todos 配列・永続化内容）が修正前後で不変であることを検証する（Preservation Checking）

### Integration Tests

- フォーム送信→追加→トグル→削除の一連のフローで「残り」表示が各時点で未完了件数と一致することを検証する
- リロードを挟んでタスクが復元され、復元後の「残り」表示も未完了件数と一致することを検証する
- 空送信時に視覚的フィードバックが表示され、カウンターが変化しないことを検証する
