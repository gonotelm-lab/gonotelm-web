# Chat Deep Thinking in Settings

## Goal

Remove the「深度思考」toggle from the composer; control it in 对话设置 instead, with the same apply-immediately + per-chat localStorage persistence as style/length.

## Locked decisions

| Item | Choice |
|---|---|
| Composer | No thinking button |
| Settings UI | Same ToggleButtonGroup chips as style/length (关闭 / 开启) |
| Persistence | Same storage key as style/length; default `false` |
| Apply | Immediate (like style/length) |
| Streaming | Switch disabled while thinking toggle is disabled |

## Non-goals

- Backend / `enable_thinking` payload shape changes
- Redesign of style/length controls
