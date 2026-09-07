# Implementation Plan

- [x] 1. バグ条件の探索的再現テストを書く
  - **Property 1: Bug Condition** - 残り件数は未完了タスク数と一致する
  - **CRITICAL**: このテストは未修正コードで必ず失敗する。失敗こそがバグの存在を証明する
  - **DO NOT attempt to fix the test or the code when it fails**: 失敗してもテストやコードを修正しない
  - **NOTE**: このテストは期待される振る舞いをエンコードしており、修正後に成功すればそれが Fix の検証になる
  - **GOAL**: バグを再現する反例を surface させる（`updateCounter` が完了数を数えている根本原因を確認する）
  - **Scoped PBT Approach**: 決定的バグのため、まずは具体的な失敗ケースにプロパティを絞って再現性を確保する
  - 検証内容（design の Bug Condition / Examples より）:
    - **一部完了ケース**: 3 件追加し 1 件を完了 → 「残り」表示が未完了件数 `2` と一致することを期待（未修正コードでは完了数 `1` となり失敗）
    - **全件完了ケース**: 2 件追加し全件完了 → 「残り」表示が `0` と一致することを期待（未修正コードでは `2` となり失敗）
    - **全件未完了ケース**: 3 件追加し完了なし → 「残り」表示が `3` と一致することを期待（未修正コードでは完了数 `0` となり失敗）
    - **偶然一致エッジケース**: 4 件追加し 2 件完了 → 未完了 2・完了 2 で表示が偶然一致するため `isBugCondition` が false。誤表示は起きず、未修正でも成功しうる（バグ条件を満たさないことの確認）
  - プロパティ（Fix Checking の一般化）: 任意のタスク集合と完了フラグにおいて `remaining-count` の表示値は `todos.filter((t) => !t.done).length`（未完了件数）と一致する SHALL
  - 未修正コードでテストを実行する
  - **EXPECTED OUTCOME**: テストは FAIL する（これが正しい。バグの存在を証明する）
  - 観測した反例を記録し根本原因を理解する（例: 「3 件中 1 件完了で残りが 2 ではなく 1 と表示される」）
  - テストを書き、実行し、失敗を記録した時点でこのタスクを完了にする
  - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [x] 2. 保全プロパティテストを書く（修正実装の前に）
  - **Property 2: Preservation** - カウンター以外の振る舞いは不変
  - **IMPORTANT**: observation-first（観測優先）メソドロジーに従う
  - 未修正コードで非バグ入力（`isBugCondition` が false のケースおよびカウンター以外の操作）の振る舞いを観測し、その振る舞いを固定するプロパティベーステストを書く
  - 観測・固定する振る舞い（design の Preservation Requirements / Scope より）:
    - **タスク追加の保全（3.1）**: テキストを入れて「追加」するとタスクが `todos` に追加される
    - **空入力抑制の保全（3.2）**: 空欄のまま「追加」してもタスクは追加されず `todos` の状態は不変（`showInputFeedback` の視覚フィードバックのみ）
    - **完了トグルの保全（3.3）**: チェックボックス操作で対象タスクのみ `done` が反転する
    - **削除の保全（3.4）**: 「×」ボタンで対象タスクのみが `todos` から削除される
    - **永続化の保全（3.5）**: `saveTodos` / `loadTodos` により localStorage への保存・復元が機能する
  - プロパティ（Preservation Checking）: ランダムな操作列に対して、カウンター表示以外の状態（`todos` 配列・localStorage 保存内容・DOM 構築）が修正前後で同一である SHALL
  - 未修正コードでテストを実行する
  - **EXPECTED OUTCOME**: テストは PASS する（これが保全すべきベースラインの振る舞いを確定する）
  - テストを書き、実行し、未修正コードで成功することを確認した時点でこのタスクを完了にする
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. 残り件数の誤表示（バグ #2）を修正する

  - [x] 3.1 修正を実装する
    - `bugfix_workflow/todo-app/app.js` の `updateCounter` を 1 行修正する
    - `todos.filter((todo) => todo.done).length` を `todos.filter((todo) => !todo.done).length` に変更し、未完了（`done === false`）タスクを数えるようにする
    - `remainingEl` への代入・変数名・その他の関数には手を加えない（変更範囲を 1 行に限定して副作用を排除する）
    - 「残り」は未完了タスク件数を表示する旨のコメントを添える
    - _Bug_Condition: isBugCondition(X) where countIncomplete(X) <> countComplete(X) （design より）_
    - _Expected_Behavior: 修正後の updateCounter は「残り」に countIncomplete(X)（未完了件数）を表示する（design の expectedBehavior より）_
    - _Preservation: Preservation Requirements（追加・空入力抑制・トグル・削除・永続化）を維持する（design より）_
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.2 バグ条件の探索的再現テストが成功することを確認する
    - **Property 1: Expected Behavior** - 残り件数は未完了タスク数と一致する
    - **IMPORTANT**: タスク 1 で書いた同じテストを再実行する。新しいテストは書かない
    - タスク 1 のテストは期待される振る舞いをエンコードしている。成功すれば Expected Behavior が満たされたことを意味する
    - タスク 1 のバグ条件探索テストを実行する
    - **EXPECTED OUTCOME**: テストが PASS する（バグが修正されたことを確認する）
    - _Requirements: 2.1, 2.2_

  - [x] 3.3 保全テストが引き続き成功することを確認する
    - **Property 2: Preservation** - カウンター以外の振る舞いは不変
    - **IMPORTANT**: タスク 2 で書いた同じテストを再実行する。新しいテストは書かない
    - タスク 2 の保全プロパティテストを実行する
    - **EXPECTED OUTCOME**: テストが PASS する（リグレッションがないことを確認する）
    - 修正後もすべてのテストが成功すること（追加・空入力抑制・トグル・削除・永続化の維持）を確認する
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. チェックポイント - すべてのテストが成功することを確認する
  - すべてのテスト（Property 1 の Fix Checking、Property 2 の Preservation Checking）が成功することを確認する
  - 疑問が生じた場合はユーザーに確認する
