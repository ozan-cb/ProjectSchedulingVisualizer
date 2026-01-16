# RCPSP-viz

A CMake project with OR-Tools dependency for Resource-Constrained Project Scheduling Problem visualization.

## Build Process

### Prerequisites

- CMake 3.18 or higher
- C++ compiler (AppleClang, GCC, or Clang)
- Abseil (absl) library - must be installed and available via CMake

### Building

1. Create a build directory:

```bash
mkdir build
cd build
```

2. Configure with CMake:

```bash
cmake ..
```

3. Build the project:

```bash
cmake --build . --parallel 6
```

### Configuration

The project is configured to disable unnecessary OR-Tools components:

- ILP solvers (HiGHS, SCIP, Gurobi, CPLEX, Xpress, GLPK, COIN-OR)
- Third-party solver support
- Testing and examples
- Fuzztest

### Dependencies

OR-Tools is fetched via FetchContent from the main branch. The project requires:

- OR-Tools (automatically downloaded)
- Abseil (absl) - must be installed separately

### Known Issues

If you encounter an error about missing `absl` package:

```
Could not find a package configuration file provided by "absl"
```

Install Abseil using your system package manager or build from source, then ensure it's available in CMAKE_PREFIX_PATH.
