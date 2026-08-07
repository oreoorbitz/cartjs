# 001 - update-dependencies

## 1. Objective

Update the Node.js version to the latest LTS version and add a `.nvmrc` file to the project to ensure consistent versioning across environments.

## 2. Context
In order for a project to be maintainable, it is important to have a consistent Node.js version across environments.

## 3. Scope

### 3.1 In scope

- reading any file in the project
- updating and creating *.md and config files

### 3.2 Out of scope

- updating any existing files besides .md and config files like .tool-versions

## 4. Inputs

- package.json
- .tool-versions
- *.md

## 5. Procedure

Numbered steps. One action per step. Imperative mood.

- create a `.nvmrc` file with the latest LTS version.
- update .tool-versions with the latest LTS version of node.
- create a MD file explaining the purpose of the `.nvmrc` file and provide a bash script for the user to use to automatically update the Node.js version to that defined in the `.nvmrc` file.
- Run npm install to see Unsupported engine warnings and make a list of all outdated dependencies.
- Create a plan to replace all outdated dependencies with modern alternatives.

## 6. Constraints

- Do not assume the current state of any dependency, every dependency must be investigated using web search.
- Do not rewrite any of the project's existing code. it assumed that the project will be unusable after the updates.


## 7. Acceptance criteria

- [ ] A plans/ directory with a plan in MD format for updating the dependencies.
- [ ] The plan must follow ASD-STE100 standards.
- [ ] the plan must reference the prompt that directed it's creation.
- [ ] there must be a readme file in the plan folder explaining the purpose of the plan files.

## 9. Output

Produce a commit that contains the plan file and the readme file and updated and new config files.
