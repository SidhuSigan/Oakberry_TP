# Testing Setup and Usage

## Installation

First, install the testing dependencies:

```bash
npm install
```

## Running Tests

### Run all tests once:
```bash
npm test
```

### Run tests in watch mode (recommended during development):
```bash
npm run test:watch
```

### Run tests with coverage report:
```bash
npm run test:coverage
```

## Test Structure

The tests are organized as follows:
- `src/services/__tests__/` - Tests for business logic and services
- `src/components/__tests__/` - Tests for React components
- `src/utils/__tests__/` - Tests for utility functions

## Key Test Files

1. **scheduleService.test.ts** - Tests the core scheduling logic including:
   - Schedule generation
   - Time calculations (fixes the 24.5h bug)
   - Worker assignment validation
   - Weekly hours calculation

2. **ConsolidatedScheduleManager.test.tsx** - Tests the main component:
   - UI rendering
   - User interactions
   - Schedule generation flow
   - Warning system

3. **timeCalculations.test.ts** - Tests time calculation utilities:
   - Hour duration calculations
   - Time range calculations
   - Edge cases and bug fixes

## Coverage

The tests provide coverage for:
- ✅ Time calculation bugs (24.5h issue)
- ✅ Schedule generation logic
- ✅ UI component rendering
- ✅ User interactions
- ✅ Warning system
- ✅ Edge cases and error handling

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/ci.yml`) automatically:
1. Runs tests on Node.js 18.x and 20.x
2. Runs linter
3. Generates coverage reports
4. Builds the project
5. Deploys to GitHub Pages (on main branch)

## Running Tests Locally

To run the tests locally:

```bash
# Install dependencies
npm install

# Run tests once
npm test

# Run specific test file
npm test -- scheduleService.test.ts

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Test-Driven Development

When adding new features:

1. Write tests first (TDD approach)
2. Run tests to see them fail
3. Implement the feature
4. Run tests to see them pass
5. Refactor if needed

This ensures that:
- All features are properly tested
- Bugs are caught early
- Code quality remains high
- Refactoring is safe