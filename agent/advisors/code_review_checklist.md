# Code Review Checklist

**Before committing any code, go through this checklist.**

---

## Architecture ✅

- [ ] **Single Responsibility**: Each class/function has ONE clear responsibility
- [ ] **Dependency Injection**: Dependencies are injected, not instantiated internally
- [ ] **Layer Separation**: Clear separation between domain, application, and infrastructure
- [ ] **Dependency Direction**: Outer layers depend on inner layers, not vice versa
- [ ] **Abstractions**: Code depends on interfaces/protocols, not concrete implementations

---

## Code Quality ✅

- [ ] **Type Hints**: All function signatures have type annotations
  ```python
  def process_email(email: Dict[str, Any], sender: str) -> Optional[Task]:
  ```
- [ ] **Docstrings**: All public functions/classes have clear docstrings
- [ ] **Naming Conventions**:
  - Functions: `verb_noun` (e.g., `create_task`, `get_emails`)
  - Classes: `NounVerb` (e.g., `EmailProcessor`, `TaskCreator`)
  - Constants: `UPPER_SNAKE_CASE`
- [ ] **No Magic Numbers**: All numbers extracted to named constants
- [ ] **Small Functions**: Functions are <20 lines (ideally)
- [ ] **DRY**: No duplicated code (extract common logic)

---

## Error Handling ✅

- [ ] **Specific Exceptions**: Don't use bare `except:` or catch `Exception` unless necessary
- [ ] **Error Logging**: All errors logged with context
- [ ] **Input Validation**: Validate input early (fail fast)
- [ ] **Graceful Degradation**: System handles partial failures
- [ ] **Resource Cleanup**: Resources (files, connections) properly closed

---

## Security ✅

- [ ] **No Hard-coded Secrets**: All credentials in `.env` or environment variables
- [ ] **No Secrets in Logs**: API keys, passwords never logged
- [ ] **Input Sanitization**: User input sanitized before use
- [ ] **SQL Injection**: No raw SQL queries (use parameterized queries)
- [ ] **Path Traversal**: File paths validated

---

## Testing ✅

- [ ] **Unit Tests**: Critical logic has unit tests
- [ ] **Testability**: Code can be easily tested (dependencies injectable)
- [ ] **Test Coverage**: Key paths covered
- [ ] **No Flaky Tests**: Tests are deterministic
- [ ] **Fast Tests**: Unit tests run quickly (<1s each)

---

## Performance ✅

- [ ] **No N+1 Queries**: Avoid redundant API calls in loops
- [ ] **Efficient Algorithms**: No unnecessary iterations
- [ ] **Resource Usage**: No memory leaks or unclosed connections
- [ ] **Caching**: Expensive operations cached when appropriate
- [ ] **Batch Operations**: Bulk operations where possible

---

## Configuration ✅

- [ ] **Externalized Config**: Configuration in `.env`, `config.py`, or config files
- [ ] **No Hard-coded IDs**: User IDs, list IDs, etc. in environment variables
- [ ] **Default Values**: Sensible defaults for optional configuration
- [ ] **Environment-specific**: Different configs for dev/staging/prod

---

## Documentation ✅

- [ ] **README Updated**: If architecture changed, update README/CLAUDE.md
- [ ] **Comments**: Complex logic has explanatory comments
- [ ] **API Docs**: Public APIs documented
- [ ] **Examples**: Usage examples for new features

---

## Git & Versioning ✅

- [ ] **Atomic Commits**: Each commit represents one logical change
- [ ] **Clear Commit Messages**: Descriptive messages following convention
  ```
  Add VIP email detection for lawyers and accountants

  - Created VIPDetector class with pattern matching
  - Added accountant category to vip_emails.json
  - Updated EmailAutomation to use VIPDetector

  Closes #123
  ```
- [ ] **No Sensitive Data**: `.env` and credentials not committed
- [ ] **Tests Pass**: All tests passing before commit
- [ ] **No Debug Code**: Remove `print()`, `console.log()`, debugger statements

---

## Python-Specific ✅

- [ ] **PEP 8**: Code follows PEP 8 style guide
- [ ] **Type Hints**: Using `typing` module (List, Dict, Optional, etc.)
- [ ] **Pathlib**: Using `pathlib.Path` instead of `os.path`
- [ ] **Context Managers**: Using `with` for file operations
- [ ] **Dataclasses**: Using `@dataclass` for data structures
- [ ] **Enums**: Using `Enum` for constants
- [ ] **F-strings**: Using f-strings for formatting (not `%` or `.format()`)
- [ ] **List Comprehensions**: Using comprehensions where appropriate
- [ ] **No Mutable Defaults**: No `def func(items=[]):` (use `items=None`)

---

## Clean Architecture Specific ✅

### Domain Layer
- [ ] Business logic independent of frameworks
- [ ] No external dependencies (no API clients, no database)
- [ ] Pure functions where possible
- [ ] Value objects for domain concepts

### Application Layer
- [ ] Orchestrates use cases
- [ ] Depends on domain abstractions
- [ ] Handles transaction boundaries
- [ ] Coordinates between domain and infrastructure

### Infrastructure Layer
- [ ] API clients implement domain interfaces
- [ ] Database repositories implement domain interfaces
- [ ] All external dependencies isolated here
- [ ] Can swap implementations without changing domain

---

## Common Anti-Patterns to Avoid ❌

- [ ] **God Object**: Class doing too many things
- [ ] **Primitive Obsession**: Passing strings/ints instead of value objects
- [ ] **Shotgun Surgery**: One change requires updates in many places
- [ ] **Feature Envy**: Method using more data from another class
- [ ] **Circular Dependencies**: Module A imports B imports A
- [ ] **Global State**: Mutable global variables
- [ ] **Hard-coded Dependencies**: `client = SlackClient()` inside class
- [ ] **Mixed Concerns**: Business logic mixed with data access

---

## Quick Self-Review Questions

1. **Can I unit test this easily?**
   - If no → probably violating DIP or SRP

2. **If requirements change, how many files do I need to modify?**
   - If many → probably poor separation of concerns

3. **Can I explain what this class does in one sentence?**
   - If no → probably violating SRP

4. **Can I swap this dependency (e.g., Gmail → Outlook)?**
   - If no → probably hard-coded dependency

5. **Would a new developer understand this in 5 minutes?**
   - If no → needs better naming or documentation

---

## Severity Levels

When reviewing code, classify issues by severity:

### 🔴 BLOCKER (Must fix before commit)
- Security vulnerabilities
- Hard-coded credentials
- Breaking changes without migration
- Critical bugs

### 🟠 MAJOR (Fix soon)
- SOLID violations
- Missing tests for critical paths
- Poor error handling
- Performance issues

### 🟡 MINOR (Nice to have)
- Missing docstrings
- Magic numbers
- Style inconsistencies
- TODO comments

### 🟢 SUGGESTION (Optional)
- Potential refactoring
- Alternative approaches
- Performance optimizations
- Better naming

---

## Example Review Comments

**Good** ✅
> "Great job using dependency injection here! This makes the code very testable."

**Needs Improvement** 🟠
> "This violates SRP - `EmailAutomation` is handling VIP detection, action extraction, AND task creation. Consider splitting into separate classes: `VIPDetector`, `ActionExtractor`, `TaskOrchestrator`."

**Blocker** 🔴
> "BLOCKER: Slack API token is hard-coded on line 23. Move to `.env` file immediately."

**Suggestion** 🟢
> "Consider using a dataclass for `VIPEmail` instead of passing dictionaries. It would make the code more type-safe and self-documenting."

---

_Use this checklist before every commit. Quality code is intentional code._
