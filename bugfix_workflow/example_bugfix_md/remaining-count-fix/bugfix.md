# Bugfix Requirements Document

## Introduction

ToDo リストアプリケーション（`bugfix_workflow/todo-app`）の「残り N 件」カウンター表示に関するバグを修正する。現在、カウンターは未完了タスク数ではなく完了タスク数を表示している。たとえばタスクを 3 件追加し 1 件を完了にすると、未完了は 2 件であるにもかかわらず「残り 1 件」と表示される。この不具合により、ユーザーは残っている作業量を正しく把握できない。

本修正はバグ #2（残り件数の誤表示）のみを対象とし、他の機能（タスク追加、空入力抑制、完了トグル、削除、永続化）には影響を与えない。

## Bug Analysis

### Current Behavior (Defect)

タスクの完了状態を切り替えると、「残り N 件」に完了済みタスクの数が表示される。

1.1 WHEN タスクが 1 件以上存在し、そのうち一部が完了状態である THEN the system は「残り」の数として完了済みタスクの件数を表示する
1.2 WHEN すべてのタスクが未完了である THEN the system は「残り」の数として 0 を表示する（実際の未完了件数と一致しない）

### Expected Behavior (Correct)

「残り N 件」には未完了タスクの数を表示する。

2.1 WHEN タスクが 1 件以上存在し、そのうち一部が完了状態である THEN the system SHALL 「残り」の数として未完了（done が false）タスクの件数を表示する
2.2 WHEN すべてのタスクが未完了である THEN the system SHALL 「残り」の数として全タスク件数を表示する

### Unchanged Behavior (Regression Prevention)

カウンター以外の既存の振る舞いは変更しない。

3.1 WHEN 入力欄にテキストを入れて「追加」を押す THEN the system SHALL CONTINUE TO タスクを追加する
3.2 WHEN 空欄のまま「追加」を押す THEN the system SHALL CONTINUE TO タスクを追加せず状態を変化させない
3.3 WHEN チェックボックスを操作する THEN the system SHALL CONTINUE TO タスクの完了／未完了を切り替える
3.4 WHEN 「×」ボタンを押す THEN the system SHALL CONTINUE TO そのタスクだけを削除する
3.5 WHEN ブラウザをリロードする THEN the system SHALL CONTINUE TO タスクを永続化して復元する

## Bug Condition Derivation

### Bug Condition Function

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type TodoList
  OUTPUT: boolean

  // 「残り」に表示される値が未完了タスク数と一致しない状況を検出する。
  // 現行実装は完了タスク数を数えているため、未完了数と完了数が異なる
  // すべての状態でバグが顕在化する。
  RETURN countIncomplete(X) <> countComplete(X)
END FUNCTION
```

### Property Specification (Fix Checking)

```pascal
// Property: Fix Checking - 残り件数は未完了タスク数と一致する
FOR ALL X WHERE isBugCondition(X) DO
  result ← updateCounter'(X)
  ASSERT result = countIncomplete(X)
END FOR
```

### Preservation Goal (Preservation Checking)

```pascal
// Property: Preservation Checking - カウンター以外の振る舞いは不変
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT F(X) = F'(X)
END FOR
```

**Key Definitions:**
- **F**: 修正前の関数（`todos.filter((todo) => todo.done).length` で完了数を数えている `updateCounter`）
- **F'**: 修正後の関数（未完了数を数える `updateCounter`）
- **Counterexample**: 3 件追加し 1 件を完了にすると、未完了は 2 件だが「残り 1 件」と表示される
