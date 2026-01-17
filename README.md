# ScheduleSight

**Explore Resource-Constrained Project Scheduling through interactive gameplay and solver visualization**

![ScheduleSight Logo](logo.svg)

## Demo

[![Demo ScheduleSight](https://raw.githubusercontent.com/ozan-cb/ProjectSchedulingVisualizer/main/RCPSP-viz.gif)](https://raw.githubusercontent.com/ozan-cb/ProjectSchedulingVisualizer/main/RCPSP-viz.mov)

## What is RCPSP?

The Resource-Constrained Project Scheduling Problem (RCPSP) is about scheduling tasks when you have two types of constraints:

**1. Precedence Constraints** - Tasks must happen in order

- You can't paint walls before they're built
- You can't launch a rocket before testing it
- Some tasks depend on others finishing first

**2. Resource Constraints** - You have limited resources

- Only 3 workers available
- Only 1 specialized machine
- Limited budget or materials

**The Challenge:** Find the shortest schedule that respects both types of constraints.

This sounds simple, but it's actually **NP-hard** - meaning finding optimal solutions becomes exponentially difficult as problems get larger. That's why we need sophisticated solvers like OR-Tools CP-SAT.

## Try It Yourself: The Scheduling Game

Want to understand how constraint solvers work? Try beating the solver!

ScheduleSight includes an interactive game where you can:

- **Drag and drop** tasks to create your own schedule
- **See resource usage** in real-time
- **Compare your schedule** against the optimal solution
- **Watch the solver** try to find the optimal schedule step-by-step

### How to Play

1. **Select an instance** - Choose from beginner to intermediate difficulty
2. **Drag tasks** - Click and drag task bars to schedule them
3. **Watch resources** - The resource plot shows if you're exceeding capacity
4. **Check your score** - See how close you are to the optimal makespan
5. **Watch the solver** - Switch to solver view to see how CP-SAT finds the optimal solution

### Available Instances

| Instance             | Tasks | Resources | Difficulty   | Optimal |
| -------------------- | ----- | --------- | ------------ | ------- |
| House Renovation     | 7     | 2         | Beginner     | 18      |
| Resource Constrained | 6     | 1         | Beginner     | 20      |
| Software Development | 6     | 2         | Intermediate | 14      |
| Rocket Launch        | 5     | 1         | Intermediate | 8       |

### Quick Start

```bash
# Clone and navigate to the project
git clone <repository-url>
cd ScheduleSight/frontend

# Install dependencies
npm install

# Start the game
npm run dev
```

Open `http://localhost:5173/` and start playing!

## Real-World Applications

RCPSP appears everywhere:

- **Construction**: Scheduling crews, equipment, and materials
- **Software Development**: Allocating developers to features
- **Manufacturing**: Coordinating machines and workers
- **Healthcare**: Scheduling nurses, doctors, and equipment
- **Aerospace**: Planning rocket launches and missions
- **Supply Chain**: Managing warehouses and transportation

## What ScheduleSight Shows

Most constraint solvers are black boxes - you give them a problem, they give you a solution. But **how** did they find it?

ScheduleSight peels back the curtain by capturing every step of the solver's search process:

### Watch the Solver Think

- **Task assignments**: See when the solver decides to schedule a task
- **Backtracking**: Watch the solver hit dead ends and try different approaches
- **Bound tightening**: See how the solver narrows down possibilities
- **Search patterns**: Understand the solver's strategy

### Example: Building a House

Imagine you're building a house with these tasks:

| Task       | Duration | Dependencies         | Resources Needed |
| ---------- | -------- | -------------------- | ---------------- |
| Foundation | 3 days   | None                 | 2 workers        |
| Framing    | 5 days   | Foundation           | 3 workers        |
| Electrical | 3 days   | Framing              | 1 electrician    |
| Plumbing   | 3 days   | Framing              | 1 plumber        |
| Drywall    | 2 days   | Electrical, Plumbing | 2 workers        |

**Constraints:**

- Only 4 workers total
- 1 electrician, 1 plumber
- Must follow precedence order

**Watch the solver explore:**

1. Assign Foundation to day 0-2 ✓
2. Assign Framing to day 3-7 ✓
3. Try Electrical to day 8-10, Plumbing to day 8-10 → **Too many workers!**
4. Backtrack: Try Electrical to day 8-10, Plumbing to day 11-13 ✓
5. Continue exploring until finding optimal schedule...

ScheduleSight shows you every step of this process in real-time!

## Why This Matters

Understanding how solvers work is crucial for:

- **Debugging**: Figure out why your model isn't finding solutions
- **Optimization**: Improve solver performance by understanding search patterns
- **Trust**: Build confidence in automated scheduling decisions
- **Education**: Learn constraint programming by watching it in action

## Technical Details

### Architecture

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
│  (Game + Gantt) │
└─────────────────┘
```

### Backend (C++)

- **Solver**: OR-Tools v9.14 CP-SAT
- **Event Capture**: `PropagatorInterface` with `GenericLiteralWatcher`
- **Build System**: CMake with FetchContent
- **Output**: JSON event log

### Frontend (React)

- **Framework**: React + Vite
- **Visualization**: Custom Gantt chart component
- **State Management**: Zustand
- **Game Mode**: Interactive drag-and-drop scheduling
- **Solver View**: Step-by-step search visualization

### Building from Source

```bash
# Build the driver
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
cmake --build . --target driver --parallel 6

# Run the solver (generates events.json)
cd ..
./build/driver

# Copy events to frontend
cp events.json frontend/public/events.json
```

## Contributing

Contributions welcome! Areas of interest:

- Additional game instances and difficulty levels
- New visualization types (search trees, resource usage heatmaps)
- Support for other OR-Tools solvers
- Performance optimizations
- Educational content and tutorials

## License

[Specify your license here]

## Acknowledgments

- [Google OR-Tools](https://developers.google.com/optimization) for the CP-SAT solver
- The constraint programming community for research and insights

---

**Made with ❤️ for the optimization community**
