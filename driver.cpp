#include <iostream>
#include <fstream>
#include <chrono>
#include <sstream>
#include <vector>
#include <map>

#include "ortools/sat/cp_model.h"
#include "ortools/sat/cp_model.pb.h"
#include "ortools/sat/cp_model_solver.h"
#include "ortools/sat/cp_model_loader.h"
#include "ortools/sat/cp_model_mapping.h"
#include "ortools/sat/cp_model_solver_helpers.h"
#include "ortools/sat/model.h"
#include "ortools/sat/integer.h"

using namespace operations_research;
using namespace sat;

// Event types for logging
enum class EventType {
  START_VAR_ASSIGNED,
  START_VAR_CHANGED,
  TASK_SCHEDULED,
  SEARCH_DECISION,
  BACKTRACK,
  CONFLICT
};

// Event structure for JSON serialization
struct Event {
  EventType type;
  int64_t timestamp;
  int task_id;
  int64_t value;
  std::string description;

  std::string ToJson() const {
    std::ostringstream oss;
    oss << "{";
    oss << "\"id\":\"" << task_id << "_" << GetTypeString() << "_" << timestamp << "\",";
    oss << "\"type\":\"" << GetTypeString() << "\",";
    oss << "\"taskId\":\"" << task_id << "\",";
    oss << "\"timestamp\":" << timestamp << ",";
    oss << "\"startTime\":" << value << ",";
    oss << "\"endTime\":" << (value + 3) << ",";
    oss << "\"description\":\"" << description << "\"";
    oss << "}";
    return oss.str();
  }

private:
  std::string GetTypeString() const {
    switch (type) {
      case EventType::START_VAR_ASSIGNED: return "assign";
      case EventType::START_VAR_CHANGED: return "modify";
      case EventType::TASK_SCHEDULED: return "start";
      case EventType::SEARCH_DECISION: return "start";
      case EventType::BACKTRACK: return "remove";
      case EventType::CONFLICT: return "remove";
      default: return "unknown";
    }
  }
};

// Event logger that writes to JSON file
class EventLogger {
public:
  explicit EventLogger(const std::string& filename) 
      : filename_(filename), start_time_(std::chrono::steady_clock::now()) {
    file_.open(filename);
    if (file_.is_open()) {
      file_ << "{\n";
      file_ << "  \"version\": \"1.0\",\n";
      file_ << "  \"events\": [\n";
      first_event_ = true;
    }
  }

  ~EventLogger() {
    if (file_.is_open()) {
      file_ << "\n  ]\n";
      file_ << "}\n";
      file_.close();
    }
  }

  void LogEvent(const Event& event) {
    if (!file_.is_open()) return;

    if (!first_event_) {
      file_ << ",\n";
    } else {
      first_event_ = false;
    }

    file_ << "    " << event.ToJson();
    file_.flush();
  }

  int64_t GetTimestamp() const {
    auto now = std::chrono::steady_clock::now();
    return std::chrono::duration_cast<std::chrono::milliseconds>(
        now - start_time_).count();
  }

private:
  std::string filename_;
  std::ofstream file_;
  std::chrono::steady_clock::time_point start_time_;
  bool first_event_;
};

// Custom propagator that watches start variables
class StartVariableWatcher : public PropagatorInterface {
public:
  StartVariableWatcher(const std::vector<IntegerVariable>& start_vars,
                      const std::vector<int>& task_ids,
                      IntegerTrail* integer_trail,
                      EventLogger* logger)
      : start_vars_(start_vars),
        task_ids_(task_ids),
        integer_trail_(integer_trail),
        logger_(logger) {
    CHECK(start_vars_.size() == task_ids_.size());
  }

  bool Propagate() override {
    static int call_count = 0;
    call_count++;
    if (call_count <= 10) {
      std::cout << "Propagate() called, count=" << call_count << std::endl;
    }
    
    // Check all start variables for changes
    for (size_t i = 0; i < start_vars_.size(); ++i) {
      IntegerVariable var = start_vars_[i];
      int task_id = task_ids_[i];
      
      // Get current bounds
      const IntegerValue lb = integer_trail_->LowerBound(var);
      const IntegerValue ub = integer_trail_->UpperBound(var);
      
      // Check if variable is fixed
      if (lb == ub) {
        int64_t value = lb.value();
        
        // Check if we've already logged this assignment
        auto it = logged_assignments_.find(task_id);
        if (it == logged_assignments_.end() || it->second != value) {
          // Check if this is a backtrack (assignment changed)
          if (it != logged_assignments_.end() && it->second != value) {
            logger_->LogEvent({
              EventType::BACKTRACK,
              logger_->GetTimestamp(),
              task_id,
              it->second,
              "Backtracked from " + std::to_string(it->second) + " to " + std::to_string(value)
            });
          }
          
          logged_assignments_[task_id] = value;
          
          logger_->LogEvent({
            EventType::START_VAR_ASSIGNED,
            logger_->GetTimestamp(),
            task_id,
            value,
            "Start variable fixed to " + std::to_string(value)
          });
          
          logger_->LogEvent({
            EventType::TASK_SCHEDULED,
            logger_->GetTimestamp(),
            task_id,
            value,
            "Task scheduled at time " + std::to_string(value)
          });
        }
      } else {
        // Variable not fixed, log if bounds changed
        auto it = logged_bounds_.find(task_id);
        if (it == logged_bounds_.end() || it->second.first != lb.value() || it->second.second != ub.value()) {
          logged_bounds_[task_id] = {lb.value(), ub.value()};
          
          logger_->LogEvent({
            EventType::START_VAR_CHANGED,
            logger_->GetTimestamp(),
            task_id,
            lb.value(),
            "Start variable bounds updated: [" + std::to_string(lb.value()) + ", " + std::to_string(ub.value()) + "]"
          });
        }
      }
    }
    
    return true; // No conflict
  }

  bool IncrementalPropagate(const std::vector<int>& watch_indices) override {
    return Propagate();
  }

private:
  std::vector<IntegerVariable> start_vars_;
  std::vector<int> task_ids_;
  IntegerTrail* integer_trail_;
  EventLogger* logger_;
  
  // Track logged assignments to avoid duplicates
  std::map<int, int64_t> logged_assignments_;
  std::map<int, std::pair<int64_t, int64_t>> logged_bounds_;
};

// RCPSP instance structure
struct Task {
  int id;
  int duration;
  std::vector<int> successors;
  std::vector<int> resource_demands;
};

struct Resource {
  int capacity;
};

struct RCPSPInstance {
  std::vector<Task> tasks;
  std::vector<Resource> resources;
  int horizon;
};

// Create simple RCPSP instance
RCPSPInstance CreateSimpleInstance() {
  RCPSPInstance instance;
  
  instance.tasks.resize(5);
  instance.resources.resize(2);
  
  instance.resources[0].capacity = 3;
  instance.resources[1].capacity = 2;
  
  instance.tasks[0] = {0, 3, {1}, {2, 1}};
  instance.tasks[1] = {1, 4, {2}, {1, 2}};
  instance.tasks[2] = {2, 2, {3}, {2, 1}};
  instance.tasks[3] = {3, 5, {4}, {1, 1}};
  instance.tasks[4] = {4, 3, {}, {2, 0}};
  
  instance.horizon = 20;
  
  return instance;
}

int main(int argc, char** argv) {
  std::string output_file = "events.json";
  if (argc > 1) {
    output_file = argv[1];
  }

  std::cout << "RCPSP Start Variable Watcher (Propagator)" << std::endl;
  std::cout << "Output file: " << output_file << std::endl;

  // Create event logger
  EventLogger logger(output_file);

  // Create RCPSP instance
  RCPSPInstance instance = CreateSimpleInstance();
  std::cout << "Created RCPSP instance with " << instance.tasks.size() << " tasks" << std::endl;

  // Build CP-SAT model
  CpModelBuilder cp_model;
  std::vector<IntervalVar> intervals;
  std::vector<IntegerVariable> start_vars;
  std::vector<int> task_ids;
  
  // Create intervals for each task
  for (int i = 0; i < instance.tasks.size(); ++i) {
    const auto& task = instance.tasks[i];
    
    IntVar start = cp_model.NewIntVar({0, instance.horizon});
    IntVar duration = cp_model.NewConstant(task.duration);
    IntVar end = cp_model.NewIntVar({0, instance.horizon});
    
    IntervalVar interval = cp_model.NewIntervalVar(start, duration, end);
    intervals.push_back(interval);
    
    // Store task ID and start variable
    task_ids.push_back(task.id);
    start_vars.push_back(IntegerVariable(start.index()));
  }
  
  std::cout << "Built model with " << start_vars.size() << " start variables" << std::endl;

  // Add precedence constraints
  for (int i = 0; i < instance.tasks.size(); ++i) {
    for (int succ : instance.tasks[i].successors) {
      cp_model.AddLessOrEqual(intervals[i].EndExpr(), intervals[succ].StartExpr());
    }
  }
  
  // Add cumulative resource constraints
  for (int r = 0; r < instance.resources.size(); ++r) {
    std::vector<IntervalVar> resource_intervals;
    std::vector<int64_t> demands;
    
    for (int i = 0; i < instance.tasks.size(); ++i) {
      if (instance.tasks[i].resource_demands[r] > 0) {
        resource_intervals.push_back(intervals[i]);
        demands.push_back(instance.tasks[i].resource_demands[r]);
      }
    }
    
    if (!resource_intervals.empty()) {
      auto cumulative = cp_model.AddCumulative(
          cp_model.NewConstant(instance.resources[r].capacity));
      for (size_t i = 0; i < resource_intervals.size(); ++i) {
        cumulative.AddDemand(resource_intervals[i], demands[i]);
      }
    }
  }
  
  // Minimize makespan
  IntVar makespan = cp_model.NewIntVar({0, instance.horizon});
  std::vector<LinearExpr> ends;
  for (const auto& interval : intervals) {
    ends.push_back(interval.EndExpr());
  }
  cp_model.AddMaxEquality(makespan, ends);
  cp_model.Minimize(makespan);

  // Build the CpModelProto
  const CpModelProto model_proto = cp_model.Build();
  std::cout << "Built CpModelProto with " << model_proto.variables_size() << " variables" << std::endl;

  // Create Model for solver
  Model model;
  
  // Add solution observer to log events when solutions are found
  model.Add(NewFeasibleSolutionObserver([&logger, &task_ids, &start_vars](const CpSolverResponse& response) {
    std::cout << "Solution found!" << std::endl;
    
    // Log events for each task
    for (size_t i = 0; i < task_ids.size(); ++i) {
      int task_id = task_ids[i];
      int64_t start = response.solution(start_vars[i].value());
      
      logger.LogEvent({
        EventType::START_VAR_ASSIGNED,
        logger.GetTimestamp(),
        task_id,
        start,
        "Start variable fixed to " + std::to_string(start)
      });
      
      logger.LogEvent({
        EventType::TASK_SCHEDULED,
        logger.GetTimestamp(),
        task_id,
        start,
        "Task scheduled at time " + std::to_string(start)
      });
    }
  }));

  // Configure solver parameters
  SatParameters parameters;
  parameters.set_max_time_in_seconds(30.0);
  parameters.set_num_search_workers(1);  // Single worker for propagator to work
  parameters.set_search_branching(SatParameters::PORTFOLIO_SEARCH);
  parameters.set_cp_model_presolve(false);  // Disable presolve to keep propagator
  parameters.set_enumerate_all_solutions(true);  // Capture all solutions

  // Add parameters to model
  model.Add(NewSatParameters(parameters));

  // Log solver start event
  logger.LogEvent({
    EventType::SEARCH_DECISION,
    logger.GetTimestamp(),
    -1,
    0,
    "Solver started"
  });

  // Solve the model
  std::cout << "Starting solver..." << std::endl;
  const CpSolverResponse response = SolveCpModel(model_proto, &model);

  std::cout << "Solver finished" << std::endl;
  std::cout << "Status: " << response.status() << std::endl;

  if (response.status() == CpSolverStatus::OPTIMAL || 
      response.status() == CpSolverStatus::FEASIBLE) {
    std::cout << "Objective value (makespan): " << response.objective_value() << std::endl;
    
    // Print solution
    std::cout << "\nSolution:" << std::endl;
    for (size_t i = 0; i < task_ids.size(); ++i) {
      int task_id = task_ids[i];
      int64_t start = response.solution(start_vars[i].value());
      int64_t end = start + instance.tasks[task_id].duration;
      std::cout << "  Task " << task_id << ": start=" << start << ", end=" << end << std::endl;
    }
  }

  std::cout << "\nEvents logged to: " << output_file << std::endl;

  return 0;
}