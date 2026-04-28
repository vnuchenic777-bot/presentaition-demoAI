# Technical HAR Analysis: `gtifem.ru` + `xfem.ru`

Date: 2026-04-26

## 1. Scope

This note fixes the technical `As-Is` picture from the provided HAR files and turns it into a `To-Be` MVP bridge design between two existing systems:

- `gtifem.ru` = faculty-side portfolio, review, level-based academic decision, review text, work report preview, teacher-side approval.
- `xfem.ru` = BRS / СФОП side, statements/columns, numeric grades, batch save, statement signing/locking.

The goal of this analysis is not to restate the HAR files, but to identify:

- the real working endpoints and interaction types;
- the exact technical gap between a level-based decision and a numeric BRS value;
- where the MVP bridge must sit;
- what the first safe automation modes should be.

## 2. Input Materials

Analyzed HAR files:

- `01_gtifem_open_portfolio.har`
- `02_gtifem_open_review_modal.har`
- `3_xfem_login.har`
- `4_xfem_open_scores_table.har`
- `05_xfem_open_new_statement_form.har`
- `06_xfem_save_new_statement.har`
- `07_xfem_open_scores_edit_mode.har`
- `08_xfem_save_scores.har`
- `09_xfem_sign_or_lock_column.har`

Important note:

- `3_xfem_login.har` does not actually contain a usable `xfem.ru` login flow.
- `4_xfem_open_scores_table.har` does not contain the intended score-table loading flow; it is mostly websocket noise.

These two files should be treated as weak evidence and not as the basis for integration design.

## 3. Executive Conclusion

The current process is a two-system workflow with a manual human bridge in the middle.

The teacher today performs four different translations by hand:

1. reads the student work outside both systems;
2. converts academic judgement into a level on `gtifem.ru`;
3. converts that level into a numeric score for `xfem.ru`;
4. identifies the right BRS column and the right student row manually before signing the statement.

The MVP bridge must therefore appear **after the faculty-side academic decision is approved** and **before the BRS-side statement is locked**.

In strict terms, the MVP should automate:

- extraction of the approved faculty-side decision;
- conversion of level to numeric score by rule pack;
- resolution of target student and target BRS statement/column;
- safe batch write into an unlocked BRS form;
- full audit logging.

The MVP should **not** auto-sign a BRS statement in the first safe implementation.

## 4. Confirmed Endpoint Map

## 4.1 `gtifem.ru`

| Business action | Method + endpoint | Interaction type | What is confirmed |
| --- | --- | --- | --- |
| Open teacher portfolio table | `GET https://gtifem.ru/portfolio/` | Server-rendered HTML page | The portfolio page arrives as full HTML with rows, action links, hidden moderation form, work ids, and row data. |
| Open review modal | No separate request | Pure UI action in browser | The moderation form is already embedded in the portfolio HTML as hidden block `id='moderate'`. |
| Preview work report before final approval | `POST https://gtifem.ru/portfolio/` with `id=<work_id>&action=print` | AJAX request returning HTML | The server returns printable HTML report. |
| Save teacher decision | `POST https://gtifem.ru/portfolio/` with multipart form data including `mod`, `RATING`, `THEME`, `COMMENTS`, `ACTION=edit`, `id`, `MOD_ID`, `moderate` | AJAX form submit | This is the real persistence call for the faculty-side decision. |
| Change competencies | `POST https://gtifem.ru/portfolio/` via `upd_competence(this)` | AJAX form submit | Competency editing is inline and asynchronous. |
| Delete work row | `POST https://gtifem.ru/portfolio/` with `ACTION=delete` | AJAX call | Deletion is row-level AJAX action. |

### Key faculty-side evidence

From the portfolio HTML and inline JS:

- the moderation form is already in page HTML;
- opening `Проверить` is not a server call;
- `send_form(this)` sends `new FormData(_this)` to `window.location.href` by AJAX;
- `action=print` opens a preview window and injects teacher-entered text into a printable template;
- the green `Подписать` button in the preview window does **not** call the server directly.

The preview window script does only this:

- hides the preview button in the opener;
- shows the hidden submit block in the opener;
- closes the preview window.

That means the real server-side approval is still the later `ACTION=edit` AJAX submission.

### Strict conclusion on faculty-side approval

Faculty-side approval is a **two-step UI flow but a one-step persistence flow**:

1. `action=print` = preview only, no durable save;
2. `ACTION=edit` = durable teacher decision save.

For `mod=Y` / `Принято`, the preview window is part of the acceptance ritual.

For `mod=R` / `На доработку`, the JS hides preview and reveals direct submit instead, so the rejection/rework path is shorter.

This difference matters for MVP event detection.

## 4.2 `xfem.ru`

| Business action | Method + endpoint | Interaction type | What is confirmed |
| --- | --- | --- | --- |
| Open new statement category screen | `GET https://xfem.ru/grade/report/custom/custom.php?courseid=12636` | Server-rendered HTML page | First page before choosing category. |
| Open statement creation form for concrete category | `GET https://xfem.ru/grade/report/custom/custom.php?categid=2&courseid=12636` | Server-rendered HTML page | Real HTML form with statement fields. |
| Save new statement | `POST https://xfem.ru/grade/report/custom/custom.php` | HTML form submit + redirect | Returns `303 See Other`, then redirects to score table page. |
| Open score table edit mode | `GET https://xfem.ru/grade/report/custom/index.php?plugin=custom&id=12636&sesskey=...&edit=1` | Server-rendered HTML page | Main edit form with hundreds of grade inputs. |
| Save score values | `POST https://xfem.ru/grade/report/custom/index.php` | Batch HTML form submit | Saves many grade fields at once and returns full HTML page. |
| Persist UI scroll preference | `POST https://xfem.ru/grade/report/custom/ajax_lock_preference.php` | AJAX call | Service call, not grade business logic. |
| Open non-edit table mode | `GET https://xfem.ru/grade/report/custom/index.php?plugin=custom&id=12636&sesskey=...&edit=0` | Server-rendered HTML page | Non-edit table view before signing flow. |
| Sign / lock filled statement column | `POST https://xfem.ru/grade/report/custom/ajax/lock.php` with `courseid`, `eid`, `action=locksaved` | AJAX JSON call | Real lock endpoint for official signature / blocking. |

## 5. Interaction Type Classification

## 5.1 Pure UI actions without server request

- Opening `Проверить` on `gtifem.ru`.
- Opening the already embedded moderation form.
- Preview-window button `Подписать` on `gtifem.ru` itself.
  - This button only manipulates the opener DOM and reveals the hidden submit button.
  - It is **not** the final persistence endpoint.

## 5.2 Server-rendered HTML pages

- `GET /portfolio/` on `gtifem.ru`.
- `GET /grade/report/custom/custom.php?...` on `xfem.ru`.
- `GET /grade/report/custom/index.php?...` on `xfem.ru`.

These are not clean JSON APIs. They are full HTML pages and must be treated as unstable UI contracts.

## 5.3 Regular HTML form submissions

- `POST /grade/report/custom/custom.php` on `xfem.ru` to create a statement.
- `POST /grade/report/custom/index.php` on `xfem.ru` to save scores.

These are classical PHP form posts, not resource-oriented REST APIs.

## 5.4 AJAX submissions

- `POST /portfolio/` with `action=print` on `gtifem.ru`.
- `POST /portfolio/` with `ACTION=edit` on `gtifem.ru`.
- `POST /grade/report/custom/ajax_lock_preference.php` on `xfem.ru`.
- `POST /grade/report/custom/ajax/lock.php` on `xfem.ru`.

## 6. Confirmed Faculty-Side Technical Model

The teacher portfolio page already contains enough local state to support the moderation workflow:

- row-level `data-id="<work_id>"`;
- teacher identity via hidden field `moderate`;
- teacher account id via `MOD_ID`;
- review form fields:
  - `mod`
  - `RATING`
  - `THEME`
  - `COMMENTS`
  - `ACTION=edit`
  - `id`
  - `MOD_ID`
  - `moderate`

Example row evidence also shows:

- faculty-side work id, for example `data-id="267884"`;
- faculty-side student profile link, for example `/social/user/9343/`;
- module and group in row HTML;
- competency labels already rendered in row HTML.

This is important because `gtifem.ru` does expose a faculty-side student identity handle, but it is a **different namespace** from BRS-side student ids.

## 7. Confirmed BRS-Side Technical Model

## 7.1 Statement creation form

The concrete statement form on `xfem.ru` contains:

- category (`categid`)
- type (`typeid`)
- description/comment (`description`)
- lesson date (`customdate`)
- maximum grade (`grademax`)
- minimum grade as fixed display value
- `courseid`
- `sesskey`
- `_qf__edit_custom_form=1`

Observed save payload:

- `categid=2`
- `id=0`
- `courseid=12636`
- `itemtype=manual`
- `customid=`
- `sesskey=...`
- `_qf__edit_custom_form=1`
- `typeid=25`
- `description=ЛКЦ 12`
- `customdate=1777150800`
- `grademax=36,00`

`id=0` means create, not update.

The server does **not** return a clean machine-readable created statement object. It redirects back to the table.

## 7.2 Score table edit mode

The edit page contains multiple forms, but the main one is:

- `form action="index.php" method="post"`

with hidden fields:

- `id=12636`
- `sesskey=...`
- `report=custom`

and many cell fields of the form:

- `grade_<student_id>_<column_id>`
- `oldgrade_<student_id>_<column_id>`

Observed counts in the captured save sample:

- total POST params: `423`
- `grade_*` params: `199`
- `oldgrade_*` params: `220`

This confirms that saving one or a few values is still handled as a **batch form post**, not as a per-cell endpoint.

## 7.3 Internal id model on BRS-side

The same statement column is represented in several linked ways:

- table header sort id: `sortitemid=493222`
- form field suffix: `grade_<student_id>_493222`
- control-row statement id: `eid=i493222`
- edit statement URL: `custom.php?...&id=493222...`

Strict conclusion:

- the BRS statement/column id is the numeric stem, for example `493222`;
- control endpoints use the prefixed form `eid=i493222`.

This relation is critical for the MVP writer.

## 7.4 Lock/sign model

The visible UI link on the page may point to `saved_lock.php?id=...&eid=i493222`, but the actual lock operation in browser execution is an AJAX call:

- `POST /grade/report/custom/ajax/lock.php`

with:

- `courseid=12636`
- `eid=i493222`
- `action=locksaved`

Observed JSON response keys:

- `errormsg`
- `coursegrade`
- `typecategoryvalue`
- `datelocked`
- `userlocked`
- `notice`
- `avg`
- `lockdata`
- `lockitem`
- `canunlock`
- `newtitle`

Observed lock result:

- `datelocked = 26.04.2026`
- `userlocked = Морозов`
- `canunlock = 0`
- `newtitle = Снять подпись`

Strict conclusion:

- `action=locksaved` is the official BRS-side transition into signed/locked state;
- after this point, automated writing must be forbidden by policy in MVP mode;
- even if the UI later shows `Снять подпись`, current captured policy says `canunlock=0`, so no safe assumption of reversible locking should be made.

## 8. What the Weak HAR Files Do Not Prove

## 8.1 `3_xfem_login.har`

This file does **not** capture the actual `xfem.ru` login flow.

It contains:

- `GET https://gtifem.ru/bitrix/tools/public_session.php?...`
- websocket noise

Therefore it does not prove:

- login endpoint;
- redirect chain;
- cookie/session establishment;
- session lifetime model.

Any documentation that would claim these points from the provided file would be overstated.

## 8.2 `4_xfem_open_scores_table.har`

This file is not useful for table-load mechanics.

It contains only websocket noise and does not capture the intended table-opening requests.

## 9. The Real Technical Gap

The bridge problem is not only “send score from A to B”.

There are at least seven different gaps.

### Gap 1. Semantic model mismatch

`gtifem.ru` stores:

- approval status;
- qualitative level;
- review text;
- work context.

`xfem.ru` stores:

- numeric statement cell value;
- statement structure;
- category aggregates;
- course aggregates;
- statement lock state.

The systems do not share a native “same assessment object”.

### Gap 2. Student identity mismatch

Faculty-side uses one student identity namespace, for example:

- `/social/user/9343/`

BRS-side uses another namespace, for example:

- `/user/view.php?id=7516&course=12636`

These ids are not shown to be the same.

This means the MVP cannot safely rely on:

- FIO text only;
- row order only;
- group only.

It needs a crosswalk.

### Gap 3. Scale conversion gap

`gtifem.ru` level values:

- `2 = уровень не сформирован`
- `3 = пороговый`
- `4 = базовый`
- `5 = продвинутый`

`xfem.ru` expects numeric values.

There is no evidence that a universal fixed mapping should be hardcoded for all work types, all disciplines, and all statement categories.

Therefore the MVP needs a configurable conversion layer, not a magic formula.

### Gap 4. Statement resolution gap

To write into BRS, the system must know:

- `courseid`
- `categid`
- `typeid`
- statement description
- lesson date
- resulting `column_id`

The create-statement POST does not return a compact created object with `column_id`.

So after statement creation, the adapter must re-open or parse the returned table HTML and resolve the newly created column by stable attributes.

### Gap 5. Transport mismatch

Faculty-side save is AJAX to a page endpoint returning non-structured content (`Array1` in captured sample).

BRS-side grade save is a large batch HTML form post.

This means the MVP bridge cannot be a thin “call two JSON APIs” service.

It must be a browser-aware or HTML-aware adapter.

### Gap 6. Timing / officiality mismatch

Faculty-side officiality happens at `ACTION=edit` after teacher approval flow.

BRS-side officiality happens at `action=locksaved`.

The safe transfer window lies strictly between them:

- after faculty-side approval is saved;
- before BRS-side statement column is signed/locked.

### Gap 7. Audit and idempotency gap

Neither flow, in the captured form, provides a shared transfer id.

Without a dedicated bridge record, the system cannot safely answer:

- was this work already transferred?
- to which statement column?
- with which numeric value?
- by which rule version?
- before or after lock?

The MVP therefore needs its own audit ledger.

## 10. Draft `To-Be` MVP Bridge

## 10.1 Recommended architecture

The first technically realistic bridge should contain these modules:

1. `Faculty Decision Collector`
2. `Approval Normalizer`
3. `Student Identity Crosswalk`
4. `Rule Pack / Level-to-Score Mapper`
5. `BRS Statement Resolver / Creator`
6. `BRS Form Writer`
7. `Lock Guard`
8. `Audit Ledger`

## 10.2 Recommended boundary

The bridge should start from the first durable faculty-side approval event:

- `POST /portfolio/` with `ACTION=edit`

but should not immediately write to BRS in the safest first version.

The safest first boundary is:

- collect approved faculty-side decision;
- normalize it;
- prepare transfer draft;
- write into BRS only after explicit transfer confirmation or into a pre-approved unlocked draft column.

## 10.3 Proposed `approved_transfer_record`

Minimum bridge object:

```text
transfer_id
source_system = gtifem
source_work_id
faculty_student_id
faculty_teacher_id
student_fio
group_code
module_name
work_type_name
competencies[]
faculty_status_code
faculty_status_text
faculty_level_code
faculty_level_text
review_text
faculty_saved_at
rule_pack_id
rule_pack_version
target_system = xfem
xfem_courseid
xfem_student_id
xfem_categid
xfem_typeid
xfem_statement_description
xfem_statement_date
xfem_column_id
desired_numeric_score
existing_numeric_score
transfer_mode
transfer_status
lock_state_before_write
write_attempted_at
write_result
lock_state_after_write
```

This record should live outside both legacy systems.

## 10.4 Recommended end-to-end MVP sequence

```text
Teacher checks work
-> faculty-side approval saved on gtifem.ru
-> bridge captures/reads approved decision
-> bridge normalizes decision and resolves student identity
-> bridge converts level to numeric score by rule pack
-> bridge resolves target BRS statement/column
-> bridge loads current BRS edit form
-> bridge verifies column is not locked
-> bridge compares current and desired value
-> bridge writes score through batch form post
-> bridge records audit trail
-> teacher reviews BRS result
-> teacher signs BRS statement manually
```

## 11. Where Teacher Approval Must Remain

In the safest MVP, teacher approval should remain at two layers:

1. **Academic approval** on `gtifem.ru`
   - teacher decides status, level, review text;
   - this remains the authoritative academic judgement.

2. **Official BRS signature** on `xfem.ru`
   - teacher still signs the statement/column after reviewing the transferred scores.

This keeps the AI/adapter out of the final official locking action in early rollout.

## 12. Level-to-Score Conversion Strategy

Do **not** hardcode one global conversion for all work types.

Instead use a versioned rule pack, for example:

```text
rule_pack_id = vit_2025_2026_portfolio_practice_v1

if module = "Введение в информационные технологии"
and faculty_work_type in {portfolio work types mapped to practical/lab evaluation}
and faculty_level = "Продвинутый"
then numeric_score = ...
```

The exact numeric mapping must be approved by academic owners.

From an engineering perspective, the correct design is:

- map by `module + faculty work type + competency context + target statement type`;
- version the mapping;
- log the rule version used for each transfer.

## 13. How the MVP Should Find the Right BRS Column

The adapter should not rely on free-text title only.

It should resolve target statement using a deterministic tuple:

- `courseid`
- `categid`
- `typeid`
- date
- description/comment

Then it should re-open the BRS table and resolve:

- header `sortitemid=<column_id>`
- input names `grade_<student_id>_<column_id>`
- control id `eid=i<column_id>`

This should be treated as the canonical resolved column identity.

## 14. How the MVP Should Write Scores Safely

Recommended write algorithm:

1. Open BRS edit mode with current authenticated session.
2. Parse the current HTML form.
3. Resolve the exact `student_id` and `column_id`.
4. Read current `oldgrade_*` / `grade_*`.
5. Check lock indicators for the target column.
6. If locked, abort and log.
7. If target value already equals desired value, mark idempotent success and do not rewrite.
8. If different, mutate only the intended `grade_<student_id>_<column_id>` values inside the current form snapshot.
9. Submit the batch form back to `POST /grade/report/custom/index.php`.
10. Re-read returned HTML and verify the value now matches.
11. Log result.

This is safer than synthesizing a “small custom POST” from scratch.

## 15. Idempotency Rules for the Bridge

The MVP must be idempotent.

Suggested rules:

- never rewrite the same transfer if the destination value already equals the desired value;
- store `transfer_id -> target courseid / column_id / student_id / desired value`;
- refuse duplicate writes when the same transfer has already succeeded;
- refuse writes after lock;
- if the statement column changed or was deleted, require re-resolution and log exception state.

## 16. Technical Limitations and Guardrails

These constraints should be explicitly stated in any technical design.

### Session / security

- `sesskey` cannot be hardcoded.
- Browser cookies or session state cannot be treated as permanent API credentials.
- The provided HAR files do not fully expose session establishment, so authentication must be handled through live browser session or approved local auth automation.

### HTML dependency

- Both systems are HTML-first, not stable JSON API products.
- DOM structure, field names, and inline JS behavior may change.
- Any adapter must be tested against real pages and must fail safely.

### Official locking

- After `action=locksaved`, the statement is in official signed state.
- Automatic score writing into that statement must be blocked by policy.

### Write semantics

- BRS saves scores via one batch form, not a single-cell API.
- Safe automation therefore means controlled form mutation and replay, not arbitrary point writes.

### Auditability

- Legacy systems do not provide a shared transfer object.
- The MVP must maintain its own audit table / journal.

## 17. Recommended MVP Modes

## Mode A. Safe draft-only mode

What it does:

- reads approved faculty-side decisions;
- converts level to numeric draft;
- prepares transfer registry or CSV;
- does not write to BRS.

Best for:

- pilot validation;
- proving mapping quality;
- low organizational risk.

## Mode B. Assisted transfer mode

What it does:

- resolves student and target statement;
- prepares a prevalidated transfer set;
- teacher explicitly triggers BRS write;
- teacher still signs BRS manually.

Best for:

- first real faculty pilot.

## Mode C. Automatic fill into unlocked statement

What it does:

- if target statement exists and is unlocked, writes numeric values automatically;
- never auto-locks;
- leaves BRS signature to teacher.

Best for:

- mature pilot after trust is established.

## Hard prohibition

The MVP should not:

- auto-write into already signed/locked statement columns;
- auto-unlock statements;
- auto-sign BRS statements in the first implementation wave.

## 18. What Additional HAR Captures Are Still Needed

Mandatory re-capture:

1. `xfem` login flow
   - current `3_xfem_login.har` does not contain the intended evidence.
   - reshoot from clean Network:
     - open login page;
     - submit credentials;
     - capture redirects;
     - open first authenticated page.

Optional but useful re-capture:

2. Clean `xfem` open score table flow outside edit mode
   - current `4_xfem_open_scores_table.har` is not useful.
   - not critical for MVP because edit mode and save flow are already captured, but still useful for full documentation.

Optional only if deeper faculty-side automation is planned:

3. Clean faculty-side acceptance chain from:
   - opening modal;
   - previewing report;
   - clicking preview `Подписать`;
   - final `ACTION=edit` submission.

This is not strictly required anymore for endpoint mapping, because the current captures and inline JS are already enough to identify the real persistence boundary.

## 19. Final Technical Position

The MVP bridge should be placed here:

```text
gtifem faculty approval saved
-> approved transfer record created
-> level-to-score conversion by rule pack
-> student crosswalk resolution
-> BRS statement resolution / creation
-> unlocked BRS batch form write
-> teacher reviews and signs in BRS
```

This is the first implementation point that is both:

- technically realistic with the current legacy systems;
- organizationally defensible;
- compatible with partial and gradual rollout.

The most important non-obvious conclusion from the HAR analysis is this:

**the bridge is not “AI checks work and writes grade”.**

The real bridge is:

**approved academic decision -> normalized transfer record -> rule-based numeric fixation in an unlocked BRS statement -> human official signature.**

That is the correct MVP boundary.
