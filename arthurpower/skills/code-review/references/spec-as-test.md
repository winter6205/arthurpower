# S4: Test Evidence Against the Spec

S4 belongs to the code-review Spec axis. It checks whether the available test evidence supports the changed behavior's applicable specification acceptance points.

## Review criteria

- Map each applicable acceptance point for changed behavior to a test in the diff or relevant existing test suite. Report uncovered points with file-and-line evidence.
- Check that the test would fail when the required behavior is missing. A failure caused only by a typo, broken fixture, or unrelated setup issue is not evidence for the behavior.
- Check that tests exercise the behavior under review. Mocks or stubs must not replace the code whose behavior is being claimed; external dependencies may be mocked when project policy permits.
- Follow the repository's test-level and location conventions. S4 sets no universal live-test ratio.

Classify findings by their impact using the Spec-axis severity rules in the code-review protocol.

TDD owns the write-time RED → GREEN loop; S4 reviews test evidence against specified behavior.
