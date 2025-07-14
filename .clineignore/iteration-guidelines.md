# Iterative Development Guidelines for Certificate Generator App

## Purpose

This rule defines the process for iteratively building, testing, and refining the certificate generator app. It ensures that each step is clear, reviewable, and aligned with the functional specification, while maintaining clean, modular, and maintainable code.

---

## 1. Break Down Work into Small, Testable Steps

- Each iteration should focus on a single, well-defined feature or improvement.
- Before starting, clearly state the goal of the iteration (e.g., "Implement PNG upload and base64 conversion module").
- Avoid bundling unrelated changes in a single iteration.

## 2. Code Organization & SRP

- All code must be organized by feature and responsibility, not placed in a single JS file.
- Use multiple JavaScript files/modules, each with a clear, single responsibility (SRP).
  - Example: Separate modules for data parsing, image handling, UI rendering, PDF generation, etc.
- Each module should export only what is necessary and avoid side effects.
- Maintain a clear directory structure (e.g., `src/` or `modules/`).

## 3. Implement and Document

- Implement the feature or change as described in the iteration goal, in the appropriate module.
- Document what was added, changed, or fixed in this iteration.
- If relevant, update or create test data to demonstrate the new functionality.

## 4. Present Progress

- After each iteration, summarize:
  - What was accomplished
  - Any limitations or known issues
  - How to test or review the new/changed functionality
- If possible, provide a way to preview or verify the result (e.g., instructions to open index.html).

## 5. Solicit and Incorporate Feedback

- After presenting progress, request specific feedback or approval before proceeding.
- If feedback requires changes, address only the requested changes in the next iteration.
- Document how feedback was addressed.

## 6. Maintain Alignment with Specification

- Regularly compare progress against the functional specification.
- If a requested change conflicts with the specification, clarify and resolve before proceeding.

## 7. Next Steps

- At the end of each iteration, propose the next logical step(s) for review and approval.
- Only proceed to the next step after the current one is approved or feedback is incorporated.

---

## Example Iteration Flow

1. Define iteration goal: "Add PNG upload and base64 conversion module."
2. Implement feature in a dedicated module (e.g., `modules/imageUpload.js`) and update `index.html` as needed.
3. Summarize changes and provide test instructions.
4. Request feedback or approval.
5. Address feedback, if any.
6. Propose next step: "Next, implement data parsing module."

---

## General Principles

- Keep iterations small and focused.
- Organize code by feature and responsibility; do not place all logic in a single file.
- Communicate clearly at each step.
- Ensure all code and documentation is up to date.
- All CSS must remain in styles.css; no inline styles.
- All actions are client-side; no backend code.
