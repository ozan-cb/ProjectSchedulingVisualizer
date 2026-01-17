# RCPSP-viz

**Visualize the search process of Constraint Programming solvers for Resource-Constrained Project Scheduling Problems**

## Demo

[![Demo RCPSP-viz](https://raw.githubusercontent.com/ozan-cb/ProjectSchedulingVisualizer/main/RCPSP-viz.gif)](https://raw.githubusercontent.com/ozan-cb/ProjectSchedulingVisualizer/main/RCPSP-viz.mov)

## What is RCPSP?

The Resource-Constrained Project Scheduling Problem (RCPSP) is one of the most challenging and widely studied optimization problems in operations research. It involves scheduling a set of tasks subject to:

- **Precedence constraints**: Tasks must be completed in a specific order
- **Resource constraints**: Limited resources (workers, machines, materials) are available
- **Time constraints**: Each task has a duration and must be scheduled within a time horizon

**Real-world applications:**

- Construction project management
- Software development planning
- Manufacturing scheduling
- Healthcare resource allocation
- Aerospace mission planning
- Supply chain optimization

## Real-World Example: Building a House

Let's say you're building a house with the following tasks:

| Task       | Duration | Precedence           | Resources     |
| ---------- | -------- | -------------------- | ------------- |
| Foundation | 3 days   | None                 | 2 workers     |
| Framing    | 5 days   | Foundation           | 3 workers     |
| Roofing    | 2 days   | Framing              | 2 workers     |
| Electrical | 3 days   | Framing              | 1 electrician |
| Plumbing   | 3 days   | Framing              | 1 plumber     |
| Drywall    | 2 days   | Electrical, Plumbing | 2 workers     |
| Painting   | 2 days   | Drywall              | 2 workers     |
| Flooring   | 2 days   | Drywall              | 2 workers     |

**Constraints:**

- You only have **4 workers** total available at any time
- You have **1 electrician** and **1 plumber** (specialized resources)
- Tasks must follow precedence (e.g., can't frame before foundation)
- Some tasks can happen in parallel (electrical and plumbing)

**The Challenge:**
What's the shortest schedule that respects all constraints?

- If you had unlimited workers, you could do everything in parallel after framing
- But with only 4 workers, you need to carefully sequence tasks
- The solver explores different combinations, backtracking when it hits dead ends

**What RCPSP-viz Shows:**
Watch the solver try different schedules:

- Assign Foundation to day 0-2 ✓
- Assign Framing to day 3-7 ✓
- Try assigning Electrical to day 8-10, Plumbing to day 8-10 → **Too many workers!**
- Backtrack: Try Electrical to day 8-10, Plumbing to day 11-13 ✓
- Continue exploring until finding optimal schedule...

This is exactly what RCPSP-viz visualizes - the solver's search process in real-time!

## Why is RCPSP Important?

RCPSP is **NP-hard**, meaning finding optimal solutions becomes exponentially difficult as problem size increases. This has profound implications:

- **Economic impact**: Poor scheduling can cost millions in delays and inefficiencies
- **Resource optimization**: Critical for industries with limited resources
- **Decision support**: Helps project managers make informed trade-offs
- **Algorithm research**: Serves as a benchmark for optimization techniques

Modern solvers like OR-Tools CP-SAT use sophisticated search strategies, but the search process remains a **black box**. Understanding how the solver explores the solution space is crucial for:

- Debugging constraint models
- Improving solver performance
- Building trust in automated decisions
- Educational purposes

## What Does This Library Do?

RCPSP-viz provides **unprecedented visibility** into the CP-SAT solver's search process by:

### 🔍 Intermediate Event Logging

Captures solver events in real-time using OR-Tools' `PropagatorInterface`:

- **Task assignments**: When tasks are scheduled
- **Backtracks**: When the solver backtracks from dead ends
- **Bound changes**: When time bounds are tightened
- **Search progress**: Step-by-step exploration of the solution space

### 📊 Interactive Visualization

A React-based frontend that lets you:

- **Step through** the solver's search process
- **Watch tasks** being assigned and removed in real-time
- **Understand backtracking** behavior
- **Analyze search patterns** and decision points

### 🎯 Key Features

- **Real-time event capture** using propagator hooks
- **Gantt chart visualization** of task schedules
- **Time slider** to explore solver steps
- **Task names and metadata** for clarity
- **JSON event export** for analysis

## How It Works

```
┌─────────────────┐
│   RCPSP Model   │
│  (Constraints)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  OR-Tools CP-SAT│
│     Solver      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Propagator      │ ← Captures intermediate events
│ Interface       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  events.json    │
│  (Event Log)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  React Frontend │ ← Visualizes search process
│  (Gantt Chart)  │
└─────────────────┘
```

## Quick Start

### Prerequisites

- CMake 3.18+
- C++ compiler (Clang, GCC, or MSVC)
- Node.js 18+ (for frontend)
- Bun or npm

### Build & Run

```bash
# Clone the repository
git clone <repository-url>
cd RCPSP-viz

# Build the driver
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
cmake --build . --target driver --parallel 6

# Run the solver (generates events.json)
cd ..
./build/driver

# Copy events to frontend
cp events.json frontend/public/events.json

# Start the frontend
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173/` to see the visualization!

## Example Output

The solver generates an `events.json` file containing:

```json
{
  "events": [
    {
      "type": "assign",
      "taskId": "0",
      "taskName": "Foundation",
      "timestamp": 21,
      "startTime": 0,
      "endTime": 3,
      "description": "Task assigned to start at time 0"
    },
    {
      "type": "backtrack",
      "taskId": "1",
      "timestamp": 22,
      "description": "Backtracking from task assignment"
    }
  ]
}
```

## Use Cases

### 🏗️ Project Management

Understand how scheduling decisions are made and identify bottlenecks in the search process.

### 🔬 Research & Education

Study constraint programming techniques and solver behavior in real-time.

### 🐛 Debugging

Identify why a solver is struggling to find solutions or taking too long.

### 📈 Performance Tuning

Analyze search patterns to optimize constraint models and solver parameters.

## Technical Details

### Backend (C++)

- **Solver**: OR-Tools v9.14 CP-SAT
- **Event Capture**: `PropagatorInterface` with `GenericLiteralWatcher`
- **Build System**: CMake with FetchContent
- **Output**: JSON event log

### Frontend (React)

- **Framework**: React + Vite
- **Visualization**: Custom Gantt chart component
- **State Management**: Zustand
- **UI Components**: rc-slider for time navigation

### Solver Configuration

```cpp
solver.parameters().set_num_search_workers(1);  // Required for propagator
solver.parameters().set_cp_model_presolve(false);  // Preserve model structure
```

## Contributing

Contributions are welcome! Areas of interest:

- Additional visualization types (search trees, resource usage)
- Support for other OR-Tools solvers
- Performance optimizations
- More example problems

## License

[Specify your license here]

## Acknowledgments

- [Google OR-Tools](https://developers.google.com/optimization) for the CP-SAT solver
- The constraint programming community for research and insights

---

**Made with ❤️ for the optimization community**
