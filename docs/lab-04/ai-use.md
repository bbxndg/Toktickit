# Lab 4 AI Use and Reflection

## AI Agent and Model

- **Agent / Environment:** OpenAI Codex coding assistant, working with the project repository and terminal.
- **Model:** GPT-6 (Codex); the exact model variants used across earlier sessions should be confirmed against the session records.
- **Workflow:** Specification-first planning, implementation in feature branches, automated and browser testing, peer-review follow-up, and atomic commits under student direction.

---

## Selected Key Prompts

The prompts below are English reconstructions of selected requests from the Lab 4 conversation, originally written in Thai. Technical details from the relevant feature scope provide context; these are not verbatim translations.

| # | Prompt Name | Actual Prompt Text | Context and Result |
|---|---|---|---|
| 1 | **Sprint 4 Specifications and Test Planning** | "Create only the four core documents in `docs/lab-04/`: `specification.md`, `api-spec.md`, `ui-spec.md`, and `tests.md`. Base the requirements on the Lab 4 labsheet and follow the documentation structure used in earlier labs." | The first feature was limited to the four core specification and test-planning documents. |
| 2 | **Actions Taken Implementation** | "Implement Actions Taken on the Feature 2 branch: add the data model and API, support staff creation, assignment, editing, completion and cancellation, and provide read-only access to Requesters for their own Tickets. Integrate the feature into Ticket Detail and preserve the distinction between action assignee and Ticket owner." | Directed implementation of the Actions Taken feature on its dedicated branch. |
| 3 | **Actions Taken Verification** | "Test action creation, conditional validation, completion, cancellation, Requester access, and stale-update recovery. Verify performer attribution and confirm that action creation does not change Ticket ownership or status; make fixes only if testing reveals an error." | Requested testing of the proposed action workflows before making additional fixes. |
| 4 | **Ticket Workflow and Resolution** | "Complete the Ticket workflow in `server/src/utils/ticketWorkflow.ts` and the Ticket Detail UI: enforce permitted transitions and the pending-action resolution gate, record status history, and keep Requester resolution indication advisory. Test the workflow and its validation thoroughly." | Requested completion and verification of the ticket workflow feature after questioning its earlier completion status. |
| 5 | **Role Dashboards** | "Review and test the Requester and Staff/Administrator dashboards, including role-specific metrics, filtered drill-downs, pending actions, navigation, and session handling. Correct issues found and verify the feature against its intended scope." | Directed a further review, testing, and fixes for Feature 4 after earlier gaps were found. |
| 6 | **Security, Recovery, and End-to-End Verification** | "Inspect the remaining hardening and end-to-end work: verify protected Ticket and attachment access, migration and recovery, dashboard performance, responsive layouts, and browser test coverage. Identify any remaining gaps in Feature 5." | Requested another verification pass over Feature 5 and its remaining work. |
| 7 | **Lab 4 Specification Audit** | "Compare all five implemented features against `docs/lab-04/specification.md`, `api-spec.md`, and `ui-spec.md`; identify missing requirements or inconsistencies across Actions Taken, Ticket workflow, dashboards, and regression hardening. Perform the review without modifying files." | Requested a read-only comparison of the completed features against the Lab 4 specifications. |
| 8 | **Audit Fixes and README** | "Correct the implementation issues identified in the Lab 4 audit and update `README.md` with the Lab 4 features and project information. Defer the other documentation work until later." | Authorized fixes identified in the audit and a Lab 4 README update while deferring other documentation. |
| 9 | **Full Regression and Browser Testing** | "Test the updated implementation as comprehensively as possible, including server and client regression, builds, and browser-based role workflows. Check validation, permissions, error recovery, responsive behavior, and other testable cases." | Requested broad automated and browser verification of the resulting implementation. |

---

## Overall Reflection

### How I Used the AI Agent

- The AI assisted with reading the Lab 4 requirements and preparing specifications before implementation. Earlier lab documents were used as examples of writing style and project context.
- Work was organized into five feature branches, followed by an enhancement pass. The student set the scope, requested reviews and testing, and authorized fixes and commits.
- The AI assisted with implementation, test execution, diagnosing failures, and addressing peer-review comments. Review comments still need to be recorded from the actual PRs in `reviewer.md`.
- The final verification recorded in the README included server and client regression tests, browser suites, builds, lint, and database recovery checks. Passing these checks does not establish that every possible input or browser has been tested.

### Key Learnings and Effective Prompting Strategies

> **Student reflection to complete:** Describe your own experience with the AI, what prompts or constraints helped, and what you would change in future work. This section must be reviewed and written or revised by the student.

### Human Verification and Control

- The student specified the five-branch structure and restricted the initial documentation to four files.
- The student questioned completion claims and requested additional checks when reported coverage was incomplete.
- The student requested a read-only audit before authorizing fixes, and kept documentation changes scoped to the README during the enhancement pass.
- The student coordinated peer review and explicitly requested atomic commits.

> **Documentation note:** This record was drafted with AI assistance from the available conversation and repository history. The student should verify the agent/model details, prompt selection, and personal reflection before submission.
