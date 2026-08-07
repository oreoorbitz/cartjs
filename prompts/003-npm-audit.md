# 001 - update-dependencies

## 1. Objective

Update the NPM dependencies to their most recent versions or replace outdated dependencies with modern alternatives.

## 2. Context

When running npm audit fix --force, we run into several deprecated package warnings.


## 3. Scope

### 3.1 In scope

- update NPM dependencies to their most recent versions 
- If NPM dependency has been deprecated, replace it with a modern alternative.

### 3.2 Out of scope

- Do not conduct a full architectural restructuring.

## 4. Inputs

- package.json

## 5. Procedure

Numbered steps. One action per step. Imperative mood.

1. Run   npm audit fix --force to see the list of outdated dependencies.
2. Make list of outdated dependencies and their versions.
3. Make a list of deprecated dependencies that need to be replaced with modern alternatives.
4. Sort the list of outdated dependencies by how used their most recent versions are.
5. Update the first dependency in the list of dependencies that need to be replaced, if there are no items left in that list, move on to the next outdated dependency.
6. Check for errors caused after updating.
7. Create a new sub list of the new dependency issues caused by the update.
8. Address the issues in the sub list until the updated dependency is working, or could theoretically work.
9. Repeat steps 5-8 for the next outdated dependency.

## 6. Constraints

- Do not assume the current state of any dependency, every dependency must be investigated using web search.
- Do not rewrite any of the project's existing code. it assumed that the project will be unusable after the updates.


## 7. Acceptance criteria

- [ ] There are no outdated dependencies left after the update.

## 9. Output

Produce a commit that updates the dependencies and resolves any issues caused by the force audit.
