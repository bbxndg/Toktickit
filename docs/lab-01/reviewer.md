# Lab 1 Peer Review Record

## My Information

| Field | Detail |
|-------|--------|
| **Name** | [Benjamin Garforth] |
| **Student ID** | [67070501031] |
| **GitHub Username** | [bbxndg](https://github.com/bbxndg) |

---

## Peer Reviewer (Primary)

| Field | Detail |
|-------|--------|
| **Reviewer Name** | [Kawinpop Churari] |
| **Reviewer Student ID** | [67070501079] |
| **Reviewer GitHub Username** | [softkoi](https://github.com/softkoi) |

---

## Peer Reviewer (Second)

| Field | Detail |
|-------|--------|
| **Reviewer Name** | [Kittithat Disthanakornkun] |
| **Reviewer Student ID** | [67070501004] |
| **Reviewer GitHub Username** | [JeffMerry](https://github.com/JeffMerry) |

---

## Pull Requests Reviewed

> My partner reviewed the following PRs that I submitted.

### PR 1 — feature/1-project-foundation → lab1-staging

| Field | Detail |
|-------|--------|
| **PR Link** | [https://github.com/bbxndg/Toktickit/pull/5](https://github.com/bbxndg/Toktickit/pull/5) |
| **Reviewer** | [Kittithat Disthanakornkun] ([@JeffMerry](https://github.com/JeffMerry)) |
| **Review Comment** | "[The project foundation structure is correct and complete.]" |
| **My Response** | [No changes required. PR was approved and merged.] |
| **Outcome** | Approved and merged |   

---

### PR 2 — feature/2-health-check → lab1-staging

| Field | Detail |
|-------|--------|
| **PR Link** | [https://github.com/bbxndg/Toktickit/pull/6](https://github.com/bbxndg/Toktickit/pull/6) |
| **Reviewer 1** | [Kawinpop Churari] ([@softkoi](https://github.com/softkoi)) |
| **Review Comment** | "[Look good, good job]" |
| **Reviewer 2** | [Kittithat Disthanakornkun] ([@JeffMerry](https://github.com/JeffMerry)) |
| **Review Comment** | "[Everything is in good order, complete, and the JSON Response has the specified structure and includes Integration Testing with Supertest.]" |
| **My Response** | [No changes required. PR was approved and merged.] |
| **Outcome** | Approved and merged |

---

### PR 3 — feature/3-category-seed → lab1-staging

| Field | Detail |
|-------|--------|
| **PR Link** | [https://github.com/bbxndg/Toktickit/pull/7](https://github.com/bbxndg/Toktickit/pull/7) |
| **Reviewer** | [Kawinpop Churari] ([@softkoi](https://github.com/softkoi)) |
| **Review Comment** | "[You did a great job, there is nothing that needs fixing. Keep it up. Excellent work !!]" |
| **My Response** | [No changes required. PR was approved and merged.] |
| **Outcome** | Approved and merged |

---

### PR 4 — feature/4-category-list → lab1-staging

| Field | Detail |
|-------|--------|
| **PR Link** | [https://github.com/bbxndg/Toktickit/pull/8](https://github.com/bbxndg/Toktickit/pull/8) |
| **Reviewer** | [Kawinpop Churari] ([@softkoi](https://github.com/softkoi)) |
| **Review Comment** | "[Great job on this implementation! I have thoroughly reviewed the code and test suites, everything looks exceptionally clean, well-structured, and meets all the acceptance criteria. All automated tests pass smoothly. I am happy to approve this Pull Request and it is now ready to merge into main. Awesome work, and I really look forward to collaborating with you on many more labs ahead! 🚀 chan rak kun Benjamin]"
| **My Response** | [No changes required. PR was approved and merged.] |
| **Outcome** | Approved and merged |

---

## Pull Requests I Reviewed for My Partner

> I reviewed the following PRs submitted by my partner.

### PR A — [feature/1-project-foundation] → lab1-staging

| Field | Detail |
|-------|--------|
| **PR Link** | [https://github.com/softkoi/toktickit/pull/5](https://github.com/softkoi/toktickit/pull/5) |
| **My Review Comment** | "[Look good to me, good job]" |
| **Partner's Response** | "[No changes required. PR was approved and merged.]" |
| **Outcome** | Approved and merged |

---

### PR B — [feature/2-health-check] → lab1-staging

| Field | Detail |
|-------|--------|
| **PR Link** | [https://github.com/softkoi/toktickit/pull/6](https://github.com/softkoi/toktickit/pull/6) |
| **My Review Comment** | "[Hi @softkoi , thanks for the PR! I’ve reviewed your code against the Issue 2: API health check requirements. To meet the requirement, please address these points:

1. UI Text Accuracy ( Page 15 of pdf )
The instructor requires the UI to match the mockup exactly. Please update these specific strings:
Header: Change your title to exactly TokTickIT IT Service Desk (Ensure "TokTickIT" has no space).
Button: Change the button text to exactly [ Check System ].
Success Status: It must show exactly System Status: Online. (Remove any extra info like the service name in brackets).
Error Case: Please remove all Thai text and use these exact English strings on two separate lines:
System Status: Offline
Unable to connect to TokTickIT API

2. Loading State ( Page 5, Section 3.1 )
Requirement: The document specifies the loading state must show the text "loading" (all lowercase).
Fix: Ensure that while the API is fetching, the word loading is visible on the screen next to your spinner/loading indicator.

3. Trigger Logic ( Page 5, Section 3.1 )
Requirement: The spec says: "opening the frontend... must show the app name and a [Check System] button that when clicked shows the system status..."
Issue: Currently, your code uses useEffect to fetch data automatically on page load. Please change it so the fetch only triggers when the button is clicked.

4. Automated Test Logic (API-01 & UI-01)
Backend Test (Supertest): Do not create a new const app = express() inside the test file. You must import the actual app from your server source to test the real implementation.
Frontend Test (Vitest): Update your test to check for the actual rendered UI strings (e.g., expect(screen.getByText('System Status: Online')).toBeInTheDocument()) to prove it meets the visual contract.]" |
| **Partner's Response** | "[Fixed the issues as required and PR was later approved and merged]" |
| **Outcome** | Approved and merged |

### PR C — [feature/3-category-seed] → lab1-staging

| Field | Detail |
|-------|--------|
| **PR Link** | [https://github.com/softkoi/toktickit/pull/7](https://github.com/softkoi/toktickit/pull/7) |
| **My Review Comment** | "[After having a look, I would say this is ready to merge, good work.]" |
| **Partner's Response** | "[No changes required. PR was approved and merged.]" |
| **Outcome** | Approved and merged |

---

### PR D — [feature/4-category-list] → lab1-staging

| Field | Detail |
|-------|--------|
| **PR Link** | [https://github.com/softkoi/toktickit/pull/8](https://github.com/softkoi/toktickit/pull/8) |
| **My Review Comment** | "[LGTM, no changes for me, good job @softkoi]" |
| **Partner's Response** | "[No changes required. PR was approved and merged.]" |
| **Outcome** | Approved and merged |